"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bitacora_model_1 = require("../models/bitacora.model");
const bitacoraRoutes = express_1.Router();
bitacoraRoutes.post('/createBit', (req, res, next) => {
    const formularioBit = {
        nombre: req.body.nombre,
        fecha: req.body.fecha,
        proyecto: req.body.proyecto
    };
    bitacora_model_1.Bitacora.create(formularioBit).then(formularioDB => {
        try {
            res.json({
                ok: "true",
                formularioDB
            });
        }
        catch (err) {
            next(err); // genera el error con un response
        }
    });
});
exports.default = bitacoraRoutes;
