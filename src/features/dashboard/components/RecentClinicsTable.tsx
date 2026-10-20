import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useId } from 'react';

import { formatDateTime } from '@/shared/lib/formatDateTime';
import { messages } from '@/shared/messages/es';

import type { RecentClinic } from '../schemas/dashboardSummary';

const text = messages.dashboard.recentClinics;

/** The table, or why there is none: an empty list (FR-008) or one that is not available (FR-007). */
function Clinics({
  clinics,
  headingId,
}: {
  readonly clinics: readonly RecentClinic[] | null;
  readonly headingId: string;
}) {
  if (clinics === null) {
    return <Typography>{messages.dashboard.notAvailable}</Typography>;
  }
  if (clinics.length === 0) {
    return <Typography>{text.empty}</Typography>;
  }
  return (
    <TableContainer>
      <Table size="small" aria-labelledby={headingId}>
        <TableHead>
          <TableRow>
            <TableCell>{text.columns.name}</TableCell>
            <TableCell>{text.columns.status}</TableCell>
            <TableCell>{text.columns.createdAt}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {clinics.map((clinic) => (
            <TableRow key={clinic.id}>
              <TableCell sx={{ overflowWrap: 'anywhere' }}>{clinic.name}</TableCell>
              {/* The name of the status as the platform writes it, without interpreting it. */}
              <TableCell>{clinic.status.name}</TableCell>
              {/* In the zone of the browser: the day may differ from the one of UTC. */}
              <TableCell>{formatDateTime(clinic.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/**
 * The clinics registered most recently, newest first as the platform sends them (FR-005): only
 * their name, status and date of registration (FR-035), without links or actions. The table is
 * named by its heading and has a header for each column, so a screen reader can go through it.
 */
export function RecentClinicsTable({
  clinics,
}: {
  readonly clinics: readonly RecentClinic[] | null;
}) {
  const headingId = useId();
  return (
    <Box component="section" aria-labelledby={headingId}>
      <Typography variant="h6" component="h2" id={headingId} sx={{ mb: 1 }}>
        {text.title}
      </Typography>
      <Clinics clinics={clinics} headingId={headingId} />
    </Box>
  );
}
