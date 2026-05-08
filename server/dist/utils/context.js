"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserId = exports.getTenantId = exports.tenantContext = void 0;
const async_hooks_1 = require("async_hooks");
exports.tenantContext = new async_hooks_1.AsyncLocalStorage();
const getTenantId = () => {
    return exports.tenantContext.getStore()?.organizationId || null;
};
exports.getTenantId = getTenantId;
const getUserId = () => {
    return exports.tenantContext.getStore()?.userId || null;
};
exports.getUserId = getUserId;
