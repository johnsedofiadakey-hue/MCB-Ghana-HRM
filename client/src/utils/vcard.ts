/**
 * Generates a standard vCard (.vcf) formatted string on-the-fly 
 * and triggers a native file download on the client device.
 */
export function downloadVCard(card: {
  fullName: string;
  jobTitle: string;
  department?: string | null;
  phone?: string | null;
  email: string;
  website?: string | null;
  bio?: string | null;
}) {
  const vcardLines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${card.fullName.trim()}`,
    `TITLE:${card.jobTitle.trim()}`,
    `ORG:MCB Ghana${card.department ? `;${card.department.trim()}` : ''}`,
    `TEL;TYPE=CELL,VOICE:${card.phone ? card.phone.trim() : ''}`,
    `EMAIL;TYPE=PREF,INTERNET:${card.email.trim()}`,
    `URL:${card.website ? card.website.trim() : window.location.origin}`,
    `NOTE:${card.bio ? card.bio.trim() : ''}`,
    'END:VCARD'
  ];

  const vcardString = vcardLines.join('\r\n');
  const blob = new Blob([vcardString], { type: 'text/vcard;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Contact_${card.fullName.trim().replace(/\s+/g, '_')}.vcf`);
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
