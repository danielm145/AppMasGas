"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const bitacoraSchema = new mongoose_1.Schema({
    nombre: {
        type: String,
        required: [true, 'El nombre es necesario']
    },
    fecha: {
        type: Number,
    },
    proyecto: {
        type: String
    },
});
exports.Bitacora = mongoose_1.model('Bitacora', bitacoraSchema);
