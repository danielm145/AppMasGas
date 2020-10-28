"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const gremisionSchema = new mongoose_1.Schema({
    conductor: {
        type: String,
        required: [true, 'El nombre es necesario']
    },
    tipoVehiculo: {
        type: String,
    },
    kmIni: {
        type: Number
    },
    ci: {
        type: Number
    }
});
exports.GRemision = mongoose_1.model('GRemision', gremisionSchema);
