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
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Profile'
        },
        role: {
            type: String,
            required: true,
            enum: ['accused', 'victim', 'witness', 'complainant']
        },
        details: {
            type: String,
            default: ''
        },
        articles: [{
            section: String,
            description: {
                english: String,
                hindi: String
            }
        }],
        arrestDetails: {
            isArrested: {
                type: Boolean,
                default: false
            },
            arrestDate: Date,
            arrestLocation: {
                english: String,
                hindi: String
            },
            arrestingOfficer: String
        },
        courtDetails: {
            courtName: String,
            caseNumber: String,
            nextHearingDate: Date,
            judgeName: String,
            status: {
                type: String,
                enum: ['pending', 'ongoing', 'disposed', 'appealed'],
                default: 'pending'
            }
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
            required: true,
            validate: {
                validator: function(v) {
                    return /^[6-9]\d{9}$/.test(v);
                },
                message: props => `${props.value} is not a valid 10-digit mobile number! Number should start with 6-9.`
            }
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

// Update the pre-find middleware to only populate profiles
caseSchema.pre('find', function(next) {
    this.populate('profiles.profile', 'firstNameEnglish lastNameEnglish');
    next();
});

// Add a pre-findOne middleware as well
caseSchema.pre('findOne', function(next) {
    this.populate('profiles.profile', 'firstNameEnglish lastNameEnglish');
    next();
});

// Update the pre-save middleware
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