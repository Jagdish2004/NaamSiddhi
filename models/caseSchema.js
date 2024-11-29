const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const caseSchema = new Schema({
    caseNumber: {
        type: String,
        required: true,
        unique: true
    },
    caseType: {
        type: String,
        required: true,
        enum: ['criminal', 'civil', 'domestic', 'cybercrime', 'other']
    },
    priority: {
        type: String,
        required: true,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['active', 'closed', 'pending'],
        default: 'active'
    },
    incidentDate: {
        type: Date,
        required: true
    },
    description: {
        english: {
            type: String,
            required: true
        },
        hindi: String
    },
    location: {
        address: {
            english: String,
            hindi: String
        },
        city: {
            english: String,
            hindi: String
        },
        district: {
            english: String,
            hindi: String
        },
        state: {
            english: String,
            hindi: String
        },
        coordinates: {
            latitude: Number,
            longitude: Number
        }
    },
    profiles: [{
        profile: {
            type: Schema.Types.ObjectId,
            ref: 'Profile',
            required: true
        },
        role: {
            type: String,
            enum: ['accused', 'victim', 'witness', 'complainant'],
            required: true
        },
        statement: {
            english: String,
            hindi: String
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
    evidence: [{
        type: {
            type: String,
            enum: ['document', 'image', 'video', 'audio', 'other']
        },
        description: {
            english: String,
            hindi: String
        },
        fileUrl: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    timeline: [{
        action: {
            type: String,
            required: true
        },
        description: {
            english: String,
            hindi: String
        },
        date: {
            type: Date,
            default: Date.now
        },
        updatedBy: String
    }],
    assignedOfficers: [{
        officer: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        role: String,
        assignedAt: {
            type: Date,
            default: Date.now
        }
    }],
    reporter: {
        name: {
            english: {
                type: String,
                required: true
            },
            hindi: String
        },
        contact: {
            type: String,
            required: true
        },
        email: String,
        address: {
            location: {
                english: String,
                hindi: String
            },
            city: {
                english: String,
                hindi: String
            },
            district: {
                english: String,
                hindi: String
            },
            state: {
                english: String,
                hindi: String
            }
        },
        idType: {
            type: String,
            enum: ['aadhar', 'pan', 'voter', 'driving', 'passport']
        },
        idNumber: String
    }
}, {
    timestamps: true
});

// Auto-generate case number
caseSchema.pre('save', async function(next) {
    try {
        if (this.isNew && !this.caseNumber) {
            const count = await this.constructor.countDocuments();
            const year = new Date().getFullYear();
            const district = this.location?.district?.english?.substring(0, 3).toUpperCase() || 'DEL';
            this.caseNumber = `${district}/${year}/${(count + 1).toString().padStart(6, '0')}`;
        }
        next();
    } catch (error) {
        next(error);
    }
});

// Add timeline entry middleware
caseSchema.pre('save', function(next) {
    if (this.isNew) {
        this.timeline.push({
            action: 'CASE_CREATED',
            description: {
                english: 'Case was created',
                hindi: 'केस दर्ज किया गया'
            }
        });
    }
    next();
});

module.exports = mongoose.model('Case', caseSchema); 