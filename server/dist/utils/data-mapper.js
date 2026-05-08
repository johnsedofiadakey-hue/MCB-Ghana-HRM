"use strict";
// Data mapping layer to standardize and sanitize outgoing data for external APIs and CSV exports.
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapAppraisal = exports.mapTarget = exports.mapAttendance = exports.mapPayroll = exports.mapEmployee = void 0;
const mapEmployee = (user) => {
    return {
        id: user.id,
        employeeCode: user.employeeId || '',
        fullName: user.fullName,
        email: user.email,
        jobTitle: user.jobTitle || 'Unassigned',
        department: user.departmentObj?.name || 'General',
        unit: user.subUnit?.name || '',
        status: user.status,
        rank: user.role,
        joinDate: user.joinDate ? new Date(user.joinDate).toISOString().split('T')[0] : '',
        manager: user.manager?.fullName || '',
        leaveBalance: user.leaveBalance || 0,
        createdAt: user.createdAt,
    };
};
exports.mapEmployee = mapEmployee;
const mapPayroll = (payroll) => {
    return {
        id: payroll.id,
        employeeName: payroll.employee?.fullName,
        employeeCode: payroll.employee?.employeeId,
        department: payroll.employee?.departmentObj?.name,
        month: payroll.run?.month,
        year: payroll.run?.year,
        baseSalary: parseFloat(payroll.baseSalary) || 0,
        allowances: parseFloat(payroll.totalAllowances) || 0,
        deductions: parseFloat(payroll.totalDeductions) || 0,
        netPay: parseFloat(payroll.netPay) || 0,
        status: payroll.status,
    };
};
exports.mapPayroll = mapPayroll;
const mapAttendance = (log) => {
    return {
        id: log.id,
        employeeName: log.user?.fullName,
        date: new Date(log.date).toISOString().split('T')[0],
        checkInTime: log.checkInTime ? new Date(log.checkInTime).toISOString() : '',
        checkOutTime: log.checkOutTime ? new Date(log.checkOutTime).toISOString() : '',
        totalHours: parseFloat(log.hoursWorked) || 0,
        status: log.status,
        isLate: log.isLate,
        isOvertime: log.isOvertime,
    };
};
exports.mapAttendance = mapAttendance;
const mapTarget = (target) => {
    return {
        id: target.id,
        title: target.title,
        status: target.status,
        assignee: target.assignee?.fullName || '',
        department: target.department?.name || '',
        level: target.level,
        progress: parseFloat(target.progress) || 0,
        dueDate: target.dueDate ? new Date(target.dueDate).toISOString().split('T')[0] : '',
    };
};
exports.mapTarget = mapTarget;
const mapAppraisal = (appraisal) => {
    return {
        id: appraisal.id,
        employeeName: appraisal.employee?.fullName,
        department: appraisal.employee?.departmentObj?.name,
        cycle: appraisal.cycle?.name,
        status: appraisal.status,
        score: parseFloat(appraisal.calculatedScore) || 0,
        rating: appraisal.finalRating || '',
        completedAt: appraisal.completedAt ? new Date(appraisal.completedAt).toISOString().split('T')[0] : '',
    };
};
exports.mapAppraisal = mapAppraisal;
