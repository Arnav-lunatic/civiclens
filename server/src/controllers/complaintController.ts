import { Request, Response } from 'express';
import Complaint from '../models/Complaint';
import User from '../models/User';
import cloudinary from '../config/cloudinary';
import jwt from 'jsonwebtoken';
import { AuthRequest, IComplaintImage, IUser, UserRole } from '../types';

const uploadToCloudinary = (buffer: Buffer, folder: string = 'civiclens/complaints'): Promise<{ secure_url: string }> => {
  return new Promise((resolve, reject) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME === 'demo') {
      const base64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;
      return resolve({ secure_url: base64 });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result as { secure_url: string });
      }
    );
    uploadStream.end(buffer);
  });
};

const generateToken = (id: string, role: UserRole): string => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET || 'civiclens_super_secret_jwt_key_2026_sih',
    { expiresIn: '7d' }
  );
};

const buildDistrictRegexList = (districtStr?: string): RegExp[] => {
  if (!districtStr) return [];
  const raw = districtStr.toString().trim();
  const cleaned = raw.replace(/district|city|county/gi, '').trim();
  if (!cleaned && !raw) return [];

  const targets = new Set<string>();
  if (raw) targets.add(raw);
  if (cleaned) targets.add(cleaned);

  const low = (cleaned || raw).toLowerCase();

  // Known Indian District Aliases & Regional Variations
  if (low.includes('gautam') || low.includes('noida') || low.includes('gb nagar') || low.includes('buddh')) {
    targets.add('Gautam Buddha Nagar');
    targets.add('Gautam Buddh Nagar');
    targets.add('G.B. Nagar');
    targets.add('GB Nagar');
    targets.add('Noida');
    targets.add('Greater Noida');
  } else if (low.includes('bengaluru') || low.includes('bangalore')) {
    targets.add('Bengaluru');
    targets.add('Bangalore');
  } else if (low.includes('gurugram') || low.includes('gurgaon')) {
    targets.add('Gurugram');
    targets.add('Gurgaon');
  } else if (low.includes('prayagraj') || low.includes('allahabad')) {
    targets.add('Prayagraj');
    targets.add('Allahabad');
  } else if (low.includes('ayodhya') || low.includes('faizabad')) {
    targets.add('Ayodhya');
    targets.add('Faizabad');
  } else if (low.includes('kanpur')) {
    targets.add('Kanpur');
    targets.add('Kanpur Nagar');
    targets.add('Kanpur Dehat');
  }

  const regexes: RegExp[] = [];
  for (const t of targets) {
    if (!t) continue;
    const esc = t.replace(/[-[\]{}()*+?.,\\^$|#]/g, '\\$&').replace(/\s+/g, '\\s+');
    regexes.push(new RegExp(esc, 'i'));
  }

  return regexes;
};

const fetchReverseGeocode = async (lat: number, lng: number) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`,
      { headers: { 'User-Agent': 'CivicLens-App/1.0' } }
    );
    if (response.ok) {
      const data = (await response.json()) as any;
      const addr = data.address || {};
      const pincode = addr.postcode ? addr.postcode.replace(/\D/g, '').slice(0, 6) : '';
      const district = addr.state_district || addr.county || addr.city || addr.suburb || addr.town || '';
      const state = addr.state || '';
      const formattedAddress = data.display_name || '';
      return { pincode, district, state, address: formattedAddress };
    }
  } catch (error) {
    console.warn('[Server ReverseGeocode Warning]:', (error as Error).message);
  }
  return null;
};

const createComplaintRecord = async ({
  title,
  description,
  category,
  images,
  latitude,
  longitude,
  address,
  pincode,
  district,
  state,
  priority,
  citizenUser,
}: {
  title: string;
  description: string;
  category: any;
  images: IComplaintImage[];
  latitude: number | string;
  longitude: number | string;
  address: string;
  pincode: string;
  district?: string;
  state?: string;
  priority?: any;
  citizenUser: IUser;
}) => {
  let cleanPincode = (pincode || '').toString().trim();
  let cleanDistrict = (district || '').toString().trim();
  let finalAddress = (address || '').toString().trim();
  let finalState = (state || '').toString().trim();

  const latNum = parseFloat(latitude.toString());
  const lngNum = parseFloat(longitude.toString());

  if (isNaN(latNum) || isNaN(lngNum)) {
    throw new Error('Strict GPS Coordinates are mandatory for grievance lodgement.');
  }

  // Fallback server-side reverse geocoding if location metadata is missing
  if (!cleanDistrict || !cleanPincode || !finalAddress || finalAddress === 'Geotagged location') {
    const geo = await fetchReverseGeocode(latNum, lngNum);
    if (geo) {
      if (!cleanDistrict && geo.district) cleanDistrict = geo.district;
      if (!cleanPincode && geo.pincode) cleanPincode = geo.pincode;
      if ((!finalAddress || finalAddress === 'Geotagged location') && geo.address) finalAddress = geo.address;
      if (!finalState && geo.state) finalState = geo.state;
    }
  }

  const primaryImageUrl = images && images.length > 0 ? images[0].url : '';
  const distRegexes = buildDistrictRegexList(cleanDistrict);

  // 1. Try District + Category match (Case-Insensitive small/upper case & aliases)
  let assignedAdmin = null;
  if (distRegexes.length > 0) {
    assignedAdmin = await User.findOne({
      role: 'subadmin',
      $or: distRegexes.map((r) => ({ assignedDistrict: r })),
      department: { $in: [category, 'All Departments', 'General Civic Administration', '', undefined] },
    });
  }

  // 2. Try District match (Case-Insensitive small/upper case & aliases)
  if (!assignedAdmin && distRegexes.length > 0) {
    assignedAdmin = await User.findOne({
      role: 'subadmin',
      $or: distRegexes.map((r) => ({ assignedDistrict: r })),
    });
  }

  // 3. Fallback to pincode match if district is not assigned
  if (!assignedAdmin && cleanPincode) {
    assignedAdmin = await User.findOne({
      role: 'subadmin',
      assignedPincodes: cleanPincode,
    });
  }

  const complaint = await Complaint.create({
    title,
    description,
    category: category || 'Other',
    imageUrl: primaryImageUrl,
    images: images || [],
    latitude: latNum,
    longitude: lngNum,
    location: {
      type: 'Point',
      coordinates: [lngNum, latNum],
    },
    address: finalAddress || 'Geotagged location',
    pincode: cleanPincode,
    district: cleanDistrict,
    state: finalState || '',
    priority: priority || 'Medium',
    citizen: citizenUser._id,
    assignedSubAdmin: assignedAdmin ? assignedAdmin._id : null,
    status: 'Pending',
    timeline: [
      {
        status: 'Pending',
        message: assignedAdmin
          ? `Grievance registered with GPS (${latNum.toFixed(5)}, ${lngNum.toFixed(5)}) and auto-routed to District (${assignedAdmin.assignedDistrict || cleanDistrict}) Officer (${assignedAdmin.name})`
          : `Grievance registered with GPS (${latNum.toFixed(5)}, ${lngNum.toFixed(5)}) for District (${cleanDistrict || 'State'}). Awaiting assignment.`,
        updatedBy: citizenUser._id,
        updaterRole: 'citizen',
        timestamp: new Date(),
      },
    ],
  });

  return { complaint, assignedAdmin };
};

const processUploadedImages = async (
  files: Express.Multer.File[],
  reqBodyLat: number | string,
  reqBodyLng: number | string
): Promise<IComplaintImage[]> => {
  const images: IComplaintImage[] = [];
  const lat = parseFloat(reqBodyLat.toString());
  const lng = parseFloat(reqBodyLng.toString());

  if (files && files.length > 0) {
    for (const file of files) {
      const result = await uploadToCloudinary(file.buffer, 'civiclens/issues');
      images.push({
        url: result.secure_url,
        latitude: lat,
        longitude: lng,
        timestamp: new Date(),
      });
    }
  }
  return images;
};

// @desc    1. Create Complaint (Logged-in Citizen)
// @route   POST /api/complaints
export const createComplaint = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      title,
      description,
      category,
      latitude,
      longitude,
      address,
      pincode,
      district,
      state,
      priority,
    } = req.body;

    if (!latitude || !longitude || isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
      res.status(400).json({
        success: false,
        message: 'Strict GPS Location is mandatory. Please capture location before submitting.',
      });
      return;
    }

    if (!title || !description || !pincode) {
      res.status(400).json({
        success: false,
        message: 'Title, description, and pincode are required.',
      });
      return;
    }

    const files = (req.files as Express.Multer.File[]) || (req.file ? [req.file] : []);
    if (files.length === 0 && !req.body.imageUrl) {
      res.status(400).json({
        success: false,
        message: 'At least one live geotagged photo is required.',
      });
      return;
    }

    const images = await processUploadedImages(files, latitude, longitude);

    const { complaint } = await createComplaintRecord({
      title,
      description,
      category,
      images,
      latitude,
      longitude,
      address,
      pincode,
      district,
      state,
      priority,
      citizenUser: req.user!,
    });

    res.status(201).json({
      success: true,
      message: 'Grievance with geotagged photo(s) lodged and routed to District Officer!',
      complaint,
    });
  } catch (error) {
    console.error('Create Complaint Error:', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// @desc    2. Guest Citizen Submit with Email OTP
// @route   POST /api/complaints/submit-with-otp
export const submitComplaintWithOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      email,
      otp,
      title,
      description,
      category,
      latitude,
      longitude,
      address,
      pincode,
      district,
      state,
      priority,
    } = req.body;

    if (!latitude || !longitude || isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
      res.status(400).json({
        success: false,
        message: 'Strict GPS Location is mandatory.',
      });
      return;
    }

    if (!email || !otp) {
      res.status(400).json({ success: false, message: 'Email and verification OTP are required.' });
      return;
    }

    if (!title || !description || !pincode) {
      res.status(400).json({ success: false, message: 'Title, description, and pincode are required.' });
      return;
    }

    let user = await User.findOne({ email });
    if (!user || !user.otp || !user.otp.code) {
      res.status(400).json({
        success: false,
        message: 'No OTP found for this email. Please click "Send OTP" first.',
      });
      return;
    }

    if (new Date() > new Date(user.otp.expiresAt || 0)) {
      res.status(400).json({ success: false, message: 'OTP has expired. Please request a new OTP.' });
      return;
    }

    if (user.otp.code !== otp.trim()) {
      res.status(400).json({ success: false, message: 'Invalid OTP code. Please enter the correct 6 digits.' });
      return;
    }

    user.name = name || user.name || email.split('@')[0];
    user.isEmailVerified = true;
    user.otp = undefined;
    await user.save();

    const files = (req.files as Express.Multer.File[]) || (req.file ? [req.file] : []);
    if (files.length === 0 && !req.body.imageUrl) {
      res.status(400).json({ success: false, message: 'Live geotagged photo is required.' });
      return;
    }

    const images = await processUploadedImages(files, latitude, longitude);

    const { complaint } = await createComplaintRecord({
      title,
      description,
      category,
      images,
      latitude,
      longitude,
      address,
      pincode,
      district,
      state,
      priority,
      citizenUser: user,
    });

    const token = generateToken(user._id.toString(), user.role);

    res.status(201).json({
      success: true,
      message: 'Email verified, geotagged photos uploaded & grievance lodged!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      complaint,
    });
  } catch (error) {
    console.error('Submit Complaint with OTP Error:', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// @desc    3. Get Citizen's own complaints
// @route   GET /api/complaints/my
export const getMyComplaints = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const complaints = await Complaint.find({ citizen: req.user?._id })
      .populate('assignedSubAdmin', 'name email department phone officialId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// @desc    4. Get Public Live Feed
// @route   GET /api/complaints/public
export const getPublicComplaints = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pincode, category, status } = req.query;
    const query: any = {};

    if (pincode) query.pincode = pincode;
    if (category && category !== 'All') query.category = category;
    if (status && status !== 'All') query.status = status;

    const complaints = await Complaint.find(query)
      .select('-citizen')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// @desc    5. Get Sub-Admin Complaints (District Pincode Scoped)
// @route   GET /api/complaints/subadmin
export const getSubAdminComplaints = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const subAdmin = req.user!;
    const pincodes = subAdmin.assignedPincodes || [];
    const district = (subAdmin.assignedDistrict || '').trim();
    const cleanDist = district.replace(/district|city|county/gi, '').trim();

    // Auto-repair & backfill any older complaints missing district metadata
    try {
      const emptyDistrictComplaints = await Complaint.find({
        $or: [{ district: '' }, { district: { $exists: false } }, { district: 'Unknown' }],
        latitude: { $ne: null },
        longitude: { $ne: null },
      }).limit(10);

      for (const comp of emptyDistrictComplaints) {
        if (comp.latitude && comp.longitude) {
          const geo = await fetchReverseGeocode(comp.latitude, comp.longitude);
          if (geo) {
            let updated = false;
            if (geo.district) { comp.district = geo.district; updated = true; }
            if (geo.pincode && (!comp.pincode || comp.pincode === '')) { comp.pincode = geo.pincode; updated = true; }
            if (geo.address && (!comp.address || comp.address === 'Geotagged location')) { comp.address = geo.address; updated = true; }
            if (updated) await comp.save();
          }
        }
      }
    } catch (e) {
      // non-blocking backfill
    }

    let query: any = {};

    const isStatewide =
      !district ||
      subAdmin.role === 'superadmin' ||
      ['all', 'state jurisdiction', 'all districts', 'central district', 'statewide', 'general', 'state'].includes(district.toLowerCase());

    if (isStatewide) {
      query = {}; // Super-Admin / All Jurisdiction access
    } else {
      const distRegexes = buildDistrictRegexList(district);

      const districtOrConditions: any[] = [];
      for (const rx of distRegexes) {
        districtOrConditions.push({ district: rx });
        districtOrConditions.push({ address: rx });
      }

      query = {
        $or: [
          { assignedSubAdmin: subAdmin._id },
          ...districtOrConditions,
          ...(pincodes.length > 0 ? [{ pincode: { $in: pincodes } }] : []),
        ],
      };

      // Auto-assign any unassigned matching complaints to this subadmin
      try {
        await Complaint.updateMany(
          {
            assignedSubAdmin: null,
            $or: [
              ...districtOrConditions,
              ...(pincodes.length > 0 ? [{ pincode: { $in: pincodes } }] : []),
            ],
          },
          { $set: { assignedSubAdmin: subAdmin._id } }
        );
      } catch (e) {
        // non-blocking auto-assignment
      }
    }

    const complaints = await Complaint.find(query)
      .populate('citizen', 'name email phone')
      .populate('assignedSubAdmin', 'name email department officialId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: complaints.length,
      assignedDistrict: district,
      assignedPincodes: pincodes,
      complaints,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// @desc    6. Get All Complaints (Super-Admin)
// @route   GET /api/complaints/superadmin
export const getSuperAdminComplaints = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pincode, district, status, category } = req.query;
    const query: any = {};

    if (pincode) query.pincode = pincode;
    if (district) {
      const distRegexes = buildDistrictRegexList(district as string);
      if (distRegexes.length > 0) {
        query.$or = distRegexes.map((rx) => ({ district: rx }));
      }
    }
    if (status && status !== 'All') query.status = status;
    if (category && category !== 'All') query.category = category;

    const complaints = await Complaint.find(query)
      .populate('citizen', 'name email phone')
      .populate('assignedSubAdmin', 'name email department officialId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// @desc    7. Update Status & Resolution Proof
// @route   PUT /api/complaints/:id/status
export const updateComplaintStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, resolutionNotes } = req.body;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      res.status(404).json({ success: false, message: 'Complaint not found' });
      return;
    }

    if (req.user?.role === 'subadmin') {
      const hasPincode = req.user.assignedPincodes?.includes(complaint.pincode);
      const isDirectlyAssigned = complaint.assignedSubAdmin?.toString() === req.user._id.toString();
      const adminDist = (req.user.assignedDistrict || '').trim();
      const cleanAdminDist = adminDist.replace(/district|city|county/gi, '').trim();
      const complaintDist = (complaint.district || '').trim();
      const cleanComplaintDist = complaintDist.replace(/district|city|county/gi, '').trim();

      const isDistrictMatch =
        !adminDist ||
        adminDist === 'All' ||
        adminDist === 'State Jurisdiction' ||
        adminDist === 'All Districts' ||
        adminDist === 'Central District' ||
        (cleanAdminDist && cleanComplaintDist && cleanAdminDist.toLowerCase() === cleanComplaintDist.toLowerCase()) ||
        (adminDist && complaintDist && adminDist.toLowerCase() === complaintDist.toLowerCase()) ||
        (cleanAdminDist && complaintDist && complaintDist.toLowerCase().includes(cleanAdminDist.toLowerCase()));

      if (!hasPincode && !isDirectlyAssigned && !isDistrictMatch) {
        res.status(403).json({
          success: false,
          message: 'You are not authorized to update complaints outside your assigned district.',
        });
        return;
      }
    }

    if (status) complaint.status = status;
    if (resolutionNotes) complaint.resolutionNotes = resolutionNotes;

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'civiclens/resolutions');
      complaint.resolvedImageUrl = result.secure_url;
    } else if (req.body.resolvedImageUrl) {
      complaint.resolvedImageUrl = req.body.resolvedImageUrl;
    }

    complaint.timeline.push({
      status: status || complaint.status,
      message: resolutionNotes || `Status updated to ${status} by ${req.user?.name} (${req.user?.role})`,
      updatedBy: req.user!._id,
      updaterRole: req.user!.role,
      timestamp: new Date(),
    });

    await complaint.save();

    res.status(200).json({
      success: true,
      message: `Complaint marked as ${complaint.status}`,
      complaint,
    });
  } catch (error) {
    console.error('Update Complaint Error:', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// @desc    Analyze Complaint Image using Groq Vision API
// @route   POST /api/complaints/analyze-image
export const analyzeComplaintImage = async (req: Request, res: Response): Promise<void> => {
  try {
    let imageBase64 = '';

    if (req.file) {
      imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    } else if (req.body.imageBase64) {
      imageBase64 = req.body.imageBase64;
    } else if (req.body.imageUrl) {
      imageBase64 = req.body.imageUrl;
    }

    if (!imageBase64) {
      res.status(400).json({ success: false, message: 'Please upload or provide an image for AI analysis.' });
      return;
    }

    const groqApiKey = (process.env.GROQ_API_KEY || process.env.GROQ_KEY || '').trim();

    if (!groqApiKey) {
      console.warn('[Groq AI Warning]: GROQ_API_KEY is not configured in environment variables.');
      res.status(200).json({
        success: false,
        isValidCivicIssue: null,
        isFallback: true,
        missingApiKey: true,
        title: '',
        description: '',
        category: '',
        message: 'GROQ_API_KEY is not configured on server. Please add your Groq API key in Render / environment settings to enable live AI photo verification.',
      });
      return;
    }

    console.log('[Groq AI] Sending image to Groq Vision API...');

    const promptText = `You are a strict municipal civic infrastructure AI validator and classifier for CivicLens.
Your primary job is to verify if this image depicts an authentic, OUTDOOR or PUBLIC municipal infrastructure problem maintained by city authorities.

VALID CIVIC ISSUES (MUST BE OUTDOOR OR PUBLIC INFRASTRUCTURE):
- Roads & Potholes: Potholes, damaged roads, broken asphalt, pavement craters, damaged sidewalks/footpaths.
- Garbage & Sanitation: Overflowing public municipal garbage bins, roadside garbage dumps, trash heaps.
- Water Supply & Sewage: Broken public water pipelines, open sewage manholes, street drainage overflow.
- Electricity & Streetlights: Damaged/broken municipal streetlights, broken electric poles on streets, dangling live power wires outdoors.
- Public Infrastructure: Damaged public parks, broken benches, bus stop damage, broken public bridges, open storm drains.
- Encroachment & Traffic: Illegal street encroachments blocking roads, severe traffic hazards.

STRICT REJECTION CRITERIA (isValidCivicIssue MUST BE false):
1. PASSPORT PHOTOS / SINGLE HUMAN IMAGES / PORTRAITS: Any passport-size photo, headshot, studio portrait, selfie, photo of a single person or human face, ID photo, or photo where a human is the primary subject. Municipal authorities do not fix personal photos! You MUST set "isValidCivicIssue": false.
2. OBSCENE / NSFW / INAPPROPRIATE CONTENT: Any nudity, sexually suggestive, pornographic, obscene, or policy-violating photo. You MUST set "isValidCivicIssue": false.
3. PERSONAL ELECTRONICS & SCREENS: Laptops, notebooks, computer keyboards, illuminated laptop screens, computer monitors, tablets, smartphones, phone screens, mice, televisions, desk setups. A laptop screen, glowing display, or keyboard backlight is STRICTLY NOT a streetlight or municipal electrical issue! You MUST set "isValidCivicIssue": false.
4. INDOOR / RESIDENTIAL / DOMESTIC: Indoor rooms, bedrooms, domestic furniture, domestic ceilings, desks, household items, indoor walls, office interiors. CivicLens is STRICTLY for outdoor municipal infrastructure.
5. NON-CIVIC / RANDOM: Animals, pets, food, vehicles/cars (unless blocking a road), clothes, indoor objects, screenshots.

If the image matches ANY of the rejection criteria above, you MUST set "isValidCivicIssue": false, state the exact reason in "rejectionReason", and leave "title" and "description" as empty strings.

Respond ONLY with a valid JSON object matching this schema without any markdown surrounding text or codeblocks:
{
  "isValidCivicIssue": true or false,
  "rejectionReason": "Clear explanation if isValidCivicIssue is false, otherwise empty string.",
  "category": "One of: Roads & Potholes, Garbage & Sanitation, Water Supply & Sewage, Electricity & Streetlights, Public Infrastructure, Encroachment & Traffic, Other",
  "priority": "One of: Low, Medium, High, Critical",
  "title": "Concise 4-7 word title if valid, or empty string if invalid",
  "description": "Detailed 2-3 sentence description of observed municipal hazard if valid, or empty string if invalid"
}`;

    let groqModel = 'llama-3.2-11b-vision-preview';
    let response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: groqModel,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: promptText },
              { type: 'image_url', image_url: { url: imageBase64 } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    });

    // If 11b fails with 400 or decommissioned, attempt 90b vision model
    if (!response.ok && response.status === 400) {
      const errClone: any = await response.clone().json().catch(() => ({}));
      if (errClone.error?.code === 'model_decommissioned' || errClone.error?.message?.includes('decommissioned')) {
        console.warn(`[Groq AI Warning]: ${groqModel} is decommissioned. Trying llama-3.2-90b-vision-preview...`);
        groqModel = 'llama-3.2-90b-vision-preview';
        response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: groqModel,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: promptText },
                  { type: 'image_url', image_url: { url: imageBase64 } },
                ],
              },
            ],
            temperature: 0.1,
            max_tokens: 500,
            response_format: { type: 'json_object' },
          }),
        });
      }
    }

    const data: any = await response.json();

    if (!response.ok) {
      console.error('[Groq API Error]:', data);
      const errDetail = data.error?.message || JSON.stringify(data);
      if (errDetail.toLowerCase().includes('content') || errDetail.toLowerCase().includes('policy') || errDetail.toLowerCase().includes('safety')) {
        res.status(200).json({
          success: true,
          isValidCivicIssue: false,
          rejectionReason: 'Image was rejected by content safety filters. Inappropriate, obscene, or policy-violating photos are strictly prohibited.',
          message: 'Image was rejected by content safety filters.',
          title: '',
          description: '',
          category: '',
        });
        return;
      }
      throw new Error(`Groq API Error: ${errDetail}`);
    }

    const aiContent = data.choices?.[0]?.message?.content || '{}';
    console.log('[Groq AI Response Raw]:', aiContent);

    let parsed: any = {};
    try {
      const cleanJsonStr = aiContent.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanJsonStr);
    } catch (e) {
      console.warn('[Groq JSON Parse Warning]:', e);
      parsed = {
        isValidCivicIssue: false,
        rejectionReason: 'Could not verify image content as authentic municipal infrastructure.',
        category: 'Other',
        priority: 'Medium',
        title: '',
        description: '',
      };
    }

    // Safety guardrails: Target actual detected title and description when AI claims issue is valid
    if (parsed.isValidCivicIssue === true) {
      const textToInspect = `${parsed.title || ''} ${parsed.description || ''} ${parsed.category || ''} ${aiContent}`.toLowerCase();

      // 1. Obscene / NSFW / Adult content patterns
      const obscenePatterns = [
        'nude', 'nudity', 'nsfw', 'porn', 'obscene', 'vulgar', 'explicit',
        'naked', 'underwear', 'lingerie', 'intimate', 'erotic', 'sexual', 'genital'
      ];
      const detectedObscene = obscenePatterns.find((kw) => textToInspect.includes(kw));
      if (detectedObscene) {
        console.warn(`[Groq AI Guardrail]: Detected obscene content '${detectedObscene}'. Rejecting.`);
        parsed.isValidCivicIssue = false;
        parsed.rejectionReason = 'Obscene, sexually explicit, or inappropriate content is strictly prohibited on CivicLens.';
      }

      // 2. Passport photo / Single human / Portrait / Selfie patterns
      const humanPortraitPatterns = [
        'passport photo', 'passport-size', 'selfie', 'portrait of a person',
        'headshot', 'face photo', 'individual posing', 'person posing',
        'single human', 'id card', 'aadhaar card', 'identity card', 'driving license',
        'human face', 'profile picture', 'photo of a man', 'photo of a woman',
        'photo of a boy', 'photo of a girl', 'photo of a child', 'man wearing',
        'woman wearing', 'person smiling'
      ];
      const detectedHuman = humanPortraitPatterns.find((kw) => textToInspect.includes(kw));
      if (detectedHuman && !detectedObscene) {
        console.warn(`[Groq AI Guardrail]: Detected human portrait term '${detectedHuman}'. Rejecting.`);
        parsed.isValidCivicIssue = false;
        parsed.rejectionReason = 'Personal human portraits, passport photos, or selfies are not valid civic grievances. Please capture an outdoor photo of public municipal infrastructure damage.';
      }

      // 3. Personal electronics & indoor objects patterns
      const nonCivicPatterns = [
        'laptop', 'macbook', 'notebook computer', 'computer keyboard', 'keyboard',
        'computer monitor', 'monitor', 'screen', 'laptop screen', 'trackpad', 'keypad',
        'smartphone display', 'mobile phone screen', 'smartphone', 'mobile phone', 'cell phone',
        'tablet', 'ipad', 'television screen', 'television', 'tv display', 'tv screen',
        'office desk setup', 'office desk', 'computer desk', 'electronics',
        'indoor room', 'bedroom', 'living room', 'ceiling fan', 'furniture', 'couch', 'sofa',
        'bedsheet', 'indoor floor', 'domestic wall', 'cupboard', 'wardrobe'
      ];
      const detectedNonCivic = nonCivicPatterns.find((kw) => textToInspect.includes(kw));
      if (detectedNonCivic && !detectedObscene && !detectedHuman) {
        console.warn(`[Groq AI Guardrail]: Detected personal/indoor term '${detectedNonCivic}'. Rejecting.`);
        parsed.isValidCivicIssue = false;
        parsed.rejectionReason = `Detected non-civic object or indoor device (${detectedNonCivic}). CivicLens only accepts public municipal infrastructure hazards (e.g. damaged roads, potholes, garbage heaps, broken streetlights, sewage leakage).`;
      }
    }

    if (parsed.isValidCivicIssue === false) {
      res.status(200).json({
        success: true,
        isValidCivicIssue: false,
        rejectionReason: parsed.rejectionReason || 'Image does not depict a public civic infrastructure problem.',
        message: parsed.rejectionReason || 'Image does not depict a public civic infrastructure problem.',
        title: '',
        description: '',
        category: '',
      });
      return;
    }

    const validCategories = [
      'Roads & Potholes',
      'Garbage & Sanitation',
      'Water Supply & Sewage',
      'Electricity & Streetlights',
      'Public Infrastructure',
      'Encroachment & Traffic',
      'Other',
    ];

    let category = parsed.category || 'Other';
    if (!validCategories.includes(category)) {
      const lowerCat = category.toLowerCase();
      if (lowerCat.includes('road') || lowerCat.includes('pothole')) category = 'Roads & Potholes';
      else if (lowerCat.includes('garbage') || lowerCat.includes('waste') || lowerCat.includes('trash') || lowerCat.includes('clean')) category = 'Garbage & Sanitation';
      else if (lowerCat.includes('water') || lowerCat.includes('sewage') || lowerCat.includes('pipe') || lowerCat.includes('leak')) category = 'Water Supply & Sewage';
      else if (lowerCat.includes('electric') || lowerCat.includes('wire') || lowerCat.includes('streetlight') || lowerCat.includes('street light') || lowerCat.includes('pole')) category = 'Electricity & Streetlights';
      else if (lowerCat.includes('traffic') || lowerCat.includes('park') || lowerCat.includes('encroach')) category = 'Encroachment & Traffic';
      else category = 'Other';
    }

    const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
    let priority = parsed.priority || 'Medium';
    if (!validPriorities.includes(priority)) priority = 'Medium';

    res.status(200).json({
      success: true,
      isValidCivicIssue: true,
      category,
      priority,
      title: parsed.title || 'Geotagged Civic Issue',
      description: parsed.description || 'Auto-detected civic damage reported via Groq Vision AI.',
    });
  } catch (error: any) {
    console.error('[Analyze Complaint Image Exception]:', error.message);
    res.status(200).json({
      success: false,
      isValidCivicIssue: null,
      isFallback: true,
      category: '',
      priority: 'Medium',
      title: '',
      description: '',
      message: error.message || 'AI vision service check could not be completed.',
    });
  }
};
