import {Schema, model} from 'mongoose';

const bitacoraSchema = new Schema({
    
    nombre:{
        type: String,
        required: [true, 'El nombre es necesario']
    },
    fecha:{
        type: Number,
    },
    proyecto:{
        type:String
    },
});

export const Bitacora = model('Bitacora',bitacoraSchema);