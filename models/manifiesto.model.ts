import {Schema, model} from 'mongoose';

const manifiestoSchema = new Schema({
    
    empresa:{
        type: String,
        required: [true, 'La empresa es necesario']
    },
    registro:{
        type: Number,
    },
    domicilio:{
        type:String
    },
});

export const Manifiesto = model('Manifiesto',manifiestoSchema);