"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_RANK_MAP = exports.RoleRank = void 0;
var RoleRank;
(function (RoleRank) {
    RoleRank[RoleRank["DEV"] = 100] = "DEV";
    RoleRank[RoleRank["MD"] = 95] = "MD";
    RoleRank[RoleRank["HR_DIRECTOR"] = 92] = "HR_DIRECTOR";
    RoleRank[RoleRank["DIRECTOR"] = 90] = "DIRECTOR";
    RoleRank[RoleRank["HR_MANAGER"] = 88] = "HR_MANAGER";
    RoleRank[RoleRank["FINANCE_MANAGER"] = 87] = "FINANCE_MANAGER";
    RoleRank[RoleRank["IT_MANAGER"] = 85] = "IT_MANAGER";
    RoleRank[RoleRank["HR_OFFICER"] = 80] = "HR_OFFICER";
    RoleRank[RoleRank["MANAGER"] = 75] = "MANAGER";
    RoleRank[RoleRank["MID_MANAGER"] = 65] = "MID_MANAGER";
    RoleRank[RoleRank["SUPERVISOR"] = 65] = "SUPERVISOR";
    RoleRank[RoleRank["STAFF"] = 50] = "STAFF";
    RoleRank[RoleRank["CASUAL"] = 40] = "CASUAL";
})(RoleRank || (exports.RoleRank = RoleRank = {}));
exports.ROLE_RANK_MAP = {
    DEV: RoleRank.DEV,
    MD: RoleRank.MD,
    HR_DIRECTOR: RoleRank.HR_DIRECTOR,
    HR_MANAGER: RoleRank.HR_MANAGER,
    DIRECTOR: RoleRank.DIRECTOR,
    FINANCE_MANAGER: RoleRank.FINANCE_MANAGER,
    IT_MANAGER: RoleRank.IT_MANAGER,
    HR_OFFICER: RoleRank.HR_OFFICER,
    MANAGER: RoleRank.MANAGER,
    MID_MANAGER: RoleRank.MID_MANAGER,
    SUPERVISOR: RoleRank.SUPERVISOR,
    STAFF: RoleRank.STAFF,
    CASUAL: RoleRank.CASUAL,
    HR: RoleRank.HR_OFFICER,
    HR_ADMIN: RoleRank.HR_MANAGER,
    IT_ADMIN: RoleRank.IT_MANAGER,
    EMPLOYEE: RoleRank.STAFF,
    SUPER_ADMIN: RoleRank.MD,
    // Alias Support for DB display roles
    'MANAGING DIRECTOR': RoleRank.MD,
    'SYSTEM DEVELOPER': RoleRank.DEV,
    'HR DIRECTOR': RoleRank.HR_DIRECTOR,
    'HR OFFICER': RoleRank.HR_OFFICER,
    'HR MANAGER': RoleRank.HR_MANAGER,
    'FINANCE MANAGER': RoleRank.FINANCE_MANAGER,
    'FIANANCE MANAGER': RoleRank.FINANCE_MANAGER,
    'IT MANAGER': RoleRank.IT_MANAGER,
    'IT ADMIN': RoleRank.IT_MANAGER,
    'MID MANAGER': RoleRank.MID_MANAGER,
};
