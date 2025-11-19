// ui/MacroChart.tsx
'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function MacroChart({ rows }:{ rows: { name:string; proteinG:number; carbsG:number; fatsG:number }[] }) {
  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <BarChart data={rows}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="proteinG" stackId="a" name="Protein (g)" />
          <Bar dataKey="carbsG"   stackId="a" name="Carbs (g)" />
          <Bar dataKey="fatsG"    stackId="a" name="Fats (g)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
