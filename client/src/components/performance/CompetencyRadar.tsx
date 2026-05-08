import React from 'react';
import {
  Radar, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  Legend
} from 'recharts';

interface CompetencyRadarProps {
  selfScores: Record<string, number>;
  managerScores: Record<string, number>;
  categories: { id: string; name: string }[];
}

const CompetencyRadar: React.FC<CompetencyRadarProps> = ({ selfScores, managerScores, categories }) => {
  const data = (categories || []).map(cat => {
    if (!cat) return { subject: 'Unknown', self: 0, manager: 0, fullMark: 100 };
    return {
      subject: cat.name || 'Competency',
      self: (selfScores[cat.id] || 0) * 20, // Convert 1-5 to 0-100
      manager: (managerScores[cat.id] || 0) * 20,
      fullMark: 100,
    };
  });

  return (
    <div className="w-full h-[350px] flex items-center justify-center -ml-4">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart 
          cx="50%" 
          cy="45%" 
          outerRadius="65%" 
          data={data}
          margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
        >
          <PolarGrid stroke="var(--border-subtle)" strokeOpacity={0.2} />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ 
              fill: 'var(--text-primary)', 
              fontSize: 9, 
              fontWeight: 800,
              textAnchor: 'middle'
            }} 
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]} 
            tick={false}
            axisLine={false}
          />
          <Radar
            name="Self-Assessment"
            dataKey="self"
            stroke="#6366f1"
            strokeWidth={3}
            fill="#6366f1"
            fillOpacity={0.3}
          />
          <Radar
            name="Manager Assessment"
            dataKey="manager"
            stroke="#f59e0b"
            strokeWidth={3}
            fill="#f59e0b"
            fillOpacity={0.3}
          />
          <Legend 
            verticalAlign="bottom"
            align="center"
            iconType="circle"
            wrapperStyle={{ 
              fontSize: '9px', 
              fontWeight: '900', 
              textTransform: 'uppercase', 
              letterSpacing: '0.1em',
              paddingTop: '20px' 
            }} 
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CompetencyRadar;
