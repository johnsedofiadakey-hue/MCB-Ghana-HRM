"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const expenseController = __importStar(require("../controllers/expense.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const router = (0, express_1.Router)();
// Employee endpoints
router.post('/claims', auth_middleware_1.authenticate, (0, validate_middleware_1.validate)(validate_middleware_1.ExpenseClaimSchema), expenseController.createExpenseClaim);
router.get('/my', auth_middleware_1.authenticate, expenseController.getMyExpenses);
router.get('/my-claims', auth_middleware_1.authenticate, expenseController.getMyExpenses);
// Manager / HR endpoints
router.get('/approvals', auth_middleware_1.authenticate, expenseController.getPendingApprovals);
router.get('/pending', auth_middleware_1.authenticate, expenseController.getPendingApprovals);
router.patch('/claims/:id/approve', auth_middleware_1.authenticate, expenseController.approveExpense);
router.patch('/:id/approve', auth_middleware_1.authenticate, expenseController.approveExpense);
router.patch('/claims/:id/reject', auth_middleware_1.authenticate, expenseController.rejectExpense);
router.patch('/:id/reject', auth_middleware_1.authenticate, expenseController.rejectExpense);
exports.default = router;
