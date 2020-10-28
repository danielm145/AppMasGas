import {Schema, model} from 'mongoose';

const gremisionSchema = new Schema({
    
    conductor:{
        type: String,
        required: [true, 'El nombre es necesario']
    },
    tipoVehiculo:{
        type: String,
    },
    kmIni:{
        type:Number
    },
    ci:{
        type:Number
    }
});

export const GRemision = model('GRemision',gremisionSchema);