const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
    cloud_name: 'dkqvi1jef',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Test Cloudinary connection
cloudinary.api.ping()
    .then(result => console.log('Cloudinary connected'))
    .catch(error => console.error('Cloudinary connection error:', error));

const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = file.fieldname + '-' + uniqueSuffix;

        return {
            folder: 'police-records',
            format: 'png',
            public_id: filename,
            transformation: [
                { width: 500, height: 500, crop: 'limit' },
                { quality: 'auto' }
            ],
            resource_type: 'auto'
        };
    }
});

const fileFilter = (req, file, cb) => {
    console.log('Processing file:', file);
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload only images.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
}).fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'idProof', maxCount: 1 }
]);

// Wrap upload middleware with error handling
const handleUpload = (req, res, next) => {
    upload(req, res, async (err) => {
        if (err) {
            console.error('Upload error:', err);
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    req.flash('error', 'File too large. Maximum size is 5MB');
                } else {
                    req.flash('error', `Upload error: ${err.message}`);
                }
            } else {
                req.flash('error', `Error uploading file: ${err.message}`);
            }
            return res.redirect('/newrecord');
        }

        try {
            // Create a processed files object
            req.processedFiles = {};

            if (req.files) {
                // Process each file field
                for (const fieldname in req.files) {
                    const files = req.files[fieldname];
                    req.processedFiles[fieldname] = [];

                    for (const file of files) {
                        // Ensure we have the complete Cloudinary URL
                        if (file.path) {
                            // Create processed file object
                            const processedFile = {
                                originalname: file.originalname,
                                path: file.path,
                                cloudinaryUrl: file.path,
                                secure_url: file.path.replace('http://', 'https://'),
                                filename: file.filename
                            };
                            
                            // Store processed file
                            req.processedFiles[fieldname].push(processedFile);
                        } else {
                            console.error(`No path found for ${fieldname}:`, file);
                        }
                    }
                }
            }
            
            next();
        } catch (error) {
            console.error('Error processing uploads:', error);
            req.flash('error', 'Error processing uploaded files');
            return res.redirect('/newrecord');
        }
    });
};

module.exports = {
    cloudinary,
    handleUpload
}; 