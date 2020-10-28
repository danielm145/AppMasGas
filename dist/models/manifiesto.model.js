"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const manifiestoSchema = new mongoose_1.Schema({
    empresa: {
        type: String,
        required: [true, 'La empresa es necesario']
    },
    registro: {
        type: Number,
    },
    domicilio: {
        type: String
    },
});
exports.Manifiesto = mongoose_1.model('Manifiesto', manifiestoSchema);
