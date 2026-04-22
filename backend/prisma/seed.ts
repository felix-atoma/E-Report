import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const institution = await prisma.institution.create({
    data: {
      name: 'Lycée Démonstration NovaBulletin',
      address: 'Lomé, Togo',
      phone: '+228 90 00 00 00',
      email: 'contact@demo.novabulletin.local',
      motto: "L'excellence par le savoir",
      academicSettings: {
        termSystem: 'TRIMESTRE',
        termsPerYear: 3,
        termNames: {
          fr: ['1er Trimestre', '2ème Trimestre', '3ème Trimestre'],
          en: ['First Term', 'Second Term', 'Third Term'],
        },
        gradingScale: { min: 0, max: 20 },
        passMark: 10,
        defaultLanguage: 'fr',
      },
      brandingSettings: {
        primaryColor: '#1e40af',
        secondaryColor: '#64748b',
        accentColor: '#f59e0b',
        fontFamilyHeading: 'Open Sans',
        fontFamilyBody: 'Roboto',
      },
    },
  });

  const adminPassword = await bcrypt.hash('Admin@123', 12);
  await prisma.user.create({
    data: {
      email: 'admin@demo.novabulletin.local',
      password: adminPassword,
      name: 'Admin Principal',
      role: 'ADMIN',
      institutionId: institution.id,
    },
  });

  console.log('✅ Seed complete');
  console.log('   Admin login: admin@demo.novabulletin.local / Admin@123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
