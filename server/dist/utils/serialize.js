"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serialize = serialize;
const library_1 = require("@prisma/client/runtime/library");
/**
 * Recursively converts Prisma Decimal objects to JS numbers in any response shape.
 * Use before res.json() on any object returned from Prisma that contains Decimal fields.
 *
 * Example: res.json(serialize(payrollItem))
 */
function serialize(value) {
    if (value === null || value === undefined)
        return value;
    if (value instanceof library_1.Decimal)
        return value.toNumber();
    if (Array.isArray(value))
        return value.map(serialize);
    if (typeof value === 'object') {
        const result = {};
        for (const [k, v] of Object.entries(value)) {
            result[k] = serialize(v);
        }
        return result;
    }
    return value;
}
