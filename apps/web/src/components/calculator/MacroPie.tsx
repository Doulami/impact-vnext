'use client';
import { ResponsiveContainer, PieChart, Pie, Tooltip, Legend, Cell } from 'recharts';

// Cheerful, vibrant colors for macros
const COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D']; // Red for protein, teal for carbs, yellow for fats

export default function MacroPie({ data }:{ data:{ name:string; value:number }[] }) {
  return (
    <div style={{ width:'100%', height:280 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie 
            data={data} 
            dataKey="value" 
            nameKey="name" 
            outerRadius={110}
            label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
