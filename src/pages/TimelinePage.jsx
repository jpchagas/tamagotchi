import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'

const RANGES = ['3M', '6M', '1A', '2A', 'Tudo']

const METRICS = [
  {
    key: 'ldl',
    label: 'LDL',
    unit: 'mg/dL',
    from: 142,
    to: 98,
    status: 'Melhorando',
    statusColor: '#3ba55c',
    statusBg: '#e6f5ea',
    data: [142, 135, 128, 118, 110, 102, 98],
  },
  {
    key: 'apob',
    label: 'ApoB',
    unit: 'mg/dL',
    from: 114,
    to: 98,
    status: 'Melhorando',
    statusColor: '#3ba55c',
    statusBg: '#e6f5ea',
    data: [114, 110, 106, 103, 100, 99, 98],
  },
  {
    key: 'hba1c',
    label: 'HbA1c',
    unit: '%',
    from: 5.7,
    to: 5.6,
    status: 'Estável',
    statusColor: '#5b6b8c',
    statusBg: '#e8ecf5',
    data: [5.7, 5.7, 5.65, 5.6, 5.6, 5.6, 5.6],
  },
]

export default function TimelinePage() {
  const [range, setRange] = useState('2A')

  return (
    <Box sx={{ p: 2, pb: 10, backgroundColor: '#f7f5fa', minHeight: '100vh' }}>
      <Typography sx={{ fontWeight: 700, color: '#2b2338' }}>
        Minha saúde em números
      </Typography>
      <Typography variant="body2" sx={{ color: '#7a7186', mb: 2 }}>
        Tendências dos seus principais indicadores.
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        {RANGES.map((r) => (
          <Chip
            key={r}
            label={r}
            onClick={() => setRange(r)}
            sx={{
              backgroundColor: range === r ? '#634879' : '#fff',
              color: range === r ? '#fff' : '#7a7186',
              fontWeight: 600,
              border: range === r ? 'none' : '1px solid #e5e0ea',
            }}
          />
        ))}
      </Box>

      {METRICS.map((m) => (
        <Card key={m.key} sx={{ borderRadius: 4, p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#7a7186' }}>
                {m.label}
              </Typography>
              <Typography variant="caption" sx={{ color: '#b3aebb', display: 'block' }}>
                {m.unit}
              </Typography>
              <Typography sx={{ fontWeight: 700, color: '#2b2338', fontSize: '1.3rem' }}>
                {m.from} → {m.to}
              </Typography>
            </Box>
            <Chip
              label={m.status}
              size="small"
              sx={{ backgroundColor: m.statusBg, color: m.statusColor, fontWeight: 600 }}
            />
          </Box>

          <Box sx={{ height: 50, mt: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={m.data.map((v, i) => ({ i, v }))}>
                <YAxis domain={['dataMin', 'dataMax']} hide />
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke="#634879"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#634879' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Card>
      ))}
    </Box>
  )
}
