import prisma from '../prisma/client';
import { hash } from 'bcryptjs';

export class DemoSeederService {
  /**
   * Seeds a premium, high-end demonstration environment for a tenant.
   * This provides potential clients with a realistic "wow" experience.
   */
  static async seedTenantData(organizationId: string) {
    console.log(`[DemoSeeder] Provisioning High-End Environment for ${organizationId}...`);

    // 1. Create Professional Departments
    const departments = [
      { name: 'Executive Strategy' },
      { name: 'Human Capital' },
      { name: 'Financial Operations' },
      { name: 'Product Engineering' },
      { name: 'Global Sales' }
    ];

    const createdDepts: any[] = [];
    for (const d of departments) {
      const dept = await prisma.department.upsert({
        where: { 
          name_organizationId: {
            name: d.name,
            organizationId
          }
        },
        update: {},
        create: {
          name: d.name,
          organizationId
        }
      });
      createdDepts.push(dept);
    }

    const commonPass = await hash('MCBDemo@2025', 12);

    // 2. Identify Strategy Dept for Executives
    const execDeptId = createdDepts.find(d => d.name === 'Executive Strategy')?.id;
    const hrDeptId = createdDepts.find(d => d.name === 'Human Capital')?.id;

    // 3. Provision High-Level MD (The Master Account)
    const mdEmail = `md@demo-sand.com`;
    const mdUser = await prisma.user.upsert({
      where: { email: mdEmail },
      update: { organizationId }, // Relocate to this org
      create: {
        fullName: 'Sarah Montgomery',
        email: mdEmail,
        passwordHash: commonPass,
        role: 'MD',
        status: 'ACTIVE',
        organizationId,
        jobTitle: 'Chief Executive Officer',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
        departmentId: execDeptId,
        rank: 95
      }
    });

    // 4. Provision HR Manager and Staff
    const staff = [
      { name: 'Alice Thompson', role: 'MANAGER', dept: 'Human Capital', title: 'HR Director', email: 'hr@demo-sand.com' },
      { name: 'Marcus Chen', role: 'MANAGER', dept: 'Product Engineering', title: 'Engineering Lead', email: 'eng@demo-sand.com' },
      { name: 'Elena Rodriguez', role: 'STAFF', dept: 'Financial Operations', title: 'Senior Auditor', email: 'audit@demo-sand.com' }
    ];

    for (const s of staff) {
      const deptId = createdDepts.find(d => d.name === s.dept)?.id;
      await prisma.user.upsert({
        where: { email: s.email },
        update: { organizationId },
        create: {
          fullName: s.name,
          email: s.email,
          passwordHash: commonPass,
          role: s.role,
          status: 'ACTIVE',
          organizationId,
          jobTitle: s.title,
          departmentId: deptId,
          rank: s.role === 'MANAGER' ? 70 : 40,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.name.split(' ')[0]}`
        }
      });
    }

    // 5. Populate Corporate Announcements
    await prisma.announcement.createMany({
      data: [
        {
          title: 'Q2 Strategic Roadmap Unveiled',
          content: 'Our vision for the upcoming quarter focuses on global expansion and AI-driven efficiency.',
          priority: 'HIGH',
          organizationId,
          targetAudience: 'ALL',
          createdById: mdUser.id
        },
        {
          title: 'New Health & Wellness Initiative',
          content: 'Starting next month, all employees will have access to our subsidized premium health program.',
          priority: 'NORMAL',
          organizationId,
          targetAudience: 'ALL',
          createdById: mdUser.id
        }
      ]
    });

    console.log(`[DemoSeeder] Environment successfully provisioned.`);
    return { mdEmail };
  }
}
