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
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    const email = process.env.SUPERADMIN_EMAIL ?? 'felixatoma2@gmail.com';
    const name = process.env.SUPERADMIN_NAME ?? 'Felix Atoma';
    const password = process.env.SUPERADMIN_PASSWORD;
    if (!password) {
        console.error('ERROR: Set SUPERADMIN_PASSWORD env var before running this script.');
        process.exit(1);
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        if (existing.role === 'SUPERADMIN') {
            const hashed = await bcrypt.hash(password, 12);
            await prisma.user.update({ where: { email }, data: { password: hashed } });
            console.log(`✅ SUPERADMIN password updated for ${email}`);
        }
        else {
            console.error(`ERROR: ${email} already exists with role ${existing.role}. Aborting.`);
            process.exit(1);
        }
        return;
    }
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashed,
            role: 'SUPERADMIN',
            isActive: true,
        },
    });
    console.log(`✅ SUPERADMIN created: ${user.email} (id: ${user.id})`);
    console.log('   You can now log in at /login with role SUPERADMIN → redirects to /superadmin');
}
main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=create-superadmin.js.map