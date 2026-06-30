import { Router } from 'express';
import crypto from 'crypto';
import prisma from '../prisma/client';
import { authenticate, requireSpecificRole } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);
const appraisalAdminRoles = ['HR_DIRECTOR', 'HR_MANAGER', 'MD', 'DEV'];

type Competency = {
  id: string;
  name: string;
  description: string;
  weight: number;
};

const defaults: Competency[] = [
  { id: 'technical-delivery', name: 'Technical Delivery', description: 'Quality and timeliness of assigned work.', weight: 25 },
  { id: 'collaboration', name: 'Collaboration', description: 'Teamwork, communication, and knowledge sharing.', weight: 25 },
  { id: 'leadership', name: 'Leadership', description: 'Ownership, judgment, and support for others.', weight: 25 },
  { id: 'compliance', name: 'Compliance', description: 'Policy adherence and professional conduct.', weight: 25 },
];

const parseFeatures = (raw?: string | null): any => {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const getOrgId = (req: any) => req.user?.organizationId || 'mcb-ghana-tenant';

const getCompetencies = async (organizationId: string) => {
  const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { features: true } });
  const features = parseFeatures(org?.features);
  return Array.isArray(features.competencies) ? features.competencies : defaults;
};

const saveCompetencies = async (organizationId: string, competencies: Competency[]) => {
  const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { features: true } });
  const features = parseFeatures(org?.features);
  await prisma.organization.update({
    where: { id: organizationId },
    data: { features: JSON.stringify({ ...features, competencies }) }
  });
};

router.get('/', async (req, res) => {
  const competencies = await getCompetencies(getOrgId(req));
  res.json(competencies);
});

router.post('/', requireSpecificRole(appraisalAdminRoles), async (req, res) => {
  const organizationId = getOrgId(req);
  const competencies = await getCompetencies(organizationId);
  const competency: Competency = {
    id: crypto.randomUUID(),
    name: String(req.body.name || '').trim(),
    description: String(req.body.description || '').trim(),
    weight: Number(req.body.weight || 0),
  };

  if (!competency.name) return res.status(400).json({ error: 'Competency name is required' });
  await saveCompetencies(organizationId, [...competencies, competency]);
  res.status(201).json(competency);
});

router.put('/:id', requireSpecificRole(appraisalAdminRoles), async (req, res) => {
  const organizationId = getOrgId(req);
  const competencies = await getCompetencies(organizationId);
  const next = competencies.map(c => c.id === req.params.id ? {
    ...c,
    name: String(req.body.name || c.name).trim(),
    description: String(req.body.description ?? c.description).trim(),
    weight: Number(req.body.weight ?? c.weight),
  } : c);

  await saveCompetencies(organizationId, next);
  res.json(next.find(c => c.id === req.params.id));
});

router.delete('/:id', requireSpecificRole(appraisalAdminRoles), async (req, res) => {
  const organizationId = getOrgId(req);
  const competencies = await getCompetencies(organizationId);
  await saveCompetencies(organizationId, competencies.filter(c => c.id !== req.params.id));
  res.json({ success: true });
});

export default router;
