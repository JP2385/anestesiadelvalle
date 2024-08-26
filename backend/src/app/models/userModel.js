const mongoose = require('mongoose');
let bcrypt;

try {
    bcrypt = require('bcrypt');
} catch (err) {
    bcrypt = require('bcryptjs');
}

const Schema = mongoose.Schema;

const vacationSchema = new Schema({
    startDate: Date,
    endDate: Date
});

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    beginningDate: {
        type: Date,
    },
    doesCardio: {
        type: Boolean,
        default: false
    },
    doesPediatrics: {
        type: Boolean,
        default: false
    },
    doesRNM: {
        type: Boolean,
        default: false
    },
    worksInPublicNeuquen: {  
        type: Boolean,
        default: false
    },
    worksInPrivateNeuquen: {  
        type: Boolean,
        default: false
    },
    worksInPublicRioNegro: {  
        type: Boolean,
        default: false
    },
    worksInPrivateRioNegro: {   
        type: Boolean,
        default: false
    },
    worksInCmacOnly: {
        type: Boolean,
        default: false
    },
    workSchedule: {
        monday: {
            type: String,
            enum: ['Mañana', 'Tarde', 'Variable', 'No trabaja'],
            default: 'Variable'
        },
        tuesday: {
            type: String,
            enum: ['Mañana', 'Tarde', 'Variable', 'No trabaja'],
            default: 'Variable'
        },
        wednesday: {
            type: String,
            enum: ['Mañana', 'Tarde', 'Variable', 'No trabaja'],
            default: 'Variable'
        },
        thursday: {
            type: String,
            enum: ['Mañana', 'Tarde', 'Variable', 'No trabaja'],
            default: 'Variable'
        },
        friday: {
            type: String,
            enum: ['Mañana', 'Tarde', 'Variable', 'No trabaja'],
            default: 'Variable'
        }
    },
    vacations: [vacationSchema]
});

// Hash the password before saving the user model
userSchema.pre('save', async function (next) {
    const user = this;
    if (!user.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(user.password, salt);
        user.password = hash;
        next();
    } catch (err) {
        next(err);
    }
});

// Method to compare password
userSchema.methods.comparePassword = function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
