// The two reselling logs shown under Direct Costs / Overheads. Dropdown options are
// stored as plain text, so adding one is just a new line in `options` --
// no database change needed. `hint` is shown in the dropdown only; the
// saved value is always `value`.

const number = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 })

export const MILEAGE_LOG = {
  title: 'Mileage',
  description: 'Trips for the business, like driving to post parcels.',
  addTitle: 'Log a trip',
  emptyLabel: 'No trips logged yet.',
  table: 'resale_mileage',
  dateField: 'trip_date',
  typeField: 'reason',
  typeLabel: 'Reason for trip',
  options: [{ value: 'Posting Shirts' }],
  valueField: 'miles',
  valueLabel: 'Total miles',
  unitSuffix: 'miles',
  step: '0.1',
  format: (n) => `${number.format(n)} ${n === 1 ? 'mile' : 'miles'}`,
}

export const HOURS_LOG = {
  title: 'Hours Worked',
  description: 'Time spent on the business, by what you were doing.',
  addTitle: 'Log hours',
  emptyLabel: 'No hours logged yet.',
  table: 'resale_hours',
  dateField: 'work_date',
  typeField: 'activity',
  typeLabel: 'What you were doing',
  options: [
    { value: 'Buying Stock' },
    { value: 'Prepping Stock', hint: 'washing, ironing, sorting' },
    { value: 'Photographing Stock' },
    { value: 'Listing Stock' },
    { value: 'Developing', hint: 'website, tracking' },
  ],
  valueField: 'hours',
  valueLabel: 'Hours',
  unitSuffix: 'hrs',
  step: '0.25',
  format: (n) => `${number.format(n)} ${n === 1 ? 'hr' : 'hrs'}`,
}
