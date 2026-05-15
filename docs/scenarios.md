# Scenarios and Expected Behavior

Use these scenarios to align implementation and verification.

All timestamps below use local offset examples (`+01:00`).

## Fee Table Reference

| Time interval | Fee (DKK) |
| --- | --- |
| 06:00-06:29 | 10 |
| 06:30-06:59 | 16 |
| 07:00-07:59 | 25 |
| 08:00-08:29 | 16 |
| 08:30-14:59 | 10 |
| 15:00-15:29 | 16 |
| 15:30-16:59 | 25 |
| 17:00-17:59 | 16 |
| 18:00-18:29 | 10 |
| 18:30-05:59 | 0 |

## Technical Scenarios

### 1. Single fee-bearing passage

Input:

- Vehicle: `Car`
- Passages:
  - `2013-02-07T06:15:00+01:00`

Expected total: `10`

### 2. Multiple passages within one 60-minute window

Input:

- Vehicle: `Car`
- Passages:
  - `2013-02-07T06:05:00+01:00` (10)
  - `2013-02-07T06:35:00+01:00` (16)
  - `2013-02-07T06:55:00+01:00` (16)

Expected total: `16` (highest fee in the window)

### 3. Passages across multiple windows

Input:

- Vehicle: `Car`
- Passages:
  - `2013-02-07T06:05:00+01:00` (10)
  - `2013-02-07T07:10:00+01:00` (25)

Expected total: `35`

### 4. Daily cap reached

Input:

- Vehicle: `Car`
- Passages:
  - `2013-02-07T06:00:00+01:00` (10)
  - `2013-02-07T07:05:00+01:00` (25)
  - `2013-02-07T08:10:00+01:00` (16)
  - `2013-02-07T09:15:00+01:00` (10)
  - `2013-02-07T15:30:00+01:00` (25)
  - `2013-02-07T16:35:00+01:00` (25)
  - `2013-02-07T17:40:00+01:00` (16)

Raw total: `127`

Expected total after cap: `120`

### 5. Toll-free vehicle

Input:

- Vehicle: `Motorbike`
- Passages:
  - `2013-02-07T07:15:00+01:00`

Expected total: `0`

### 6. Weekend and holiday

Input A (weekend):

- Vehicle: `Car`
- Passage:
  - `2013-02-09T07:15:00+01:00` (Saturday)

Expected total A: `0`

Input B (holiday):

- Vehicle: `Car`
- Passage:
  - `2013-12-25T07:15:00+01:00`

Expected total B: `0`

### 7. Boundary times

Input:

- Vehicle: `Car`
- Passages:
  - `2013-02-07T06:29:00+01:00` (10)
  - `2013-02-07T06:30:00+01:00` (16)

Expected total: `16` (same 60-minute window)

### 8. Unsorted input

Input:

- Vehicle: `Car`
- Passages:
  - `2013-02-07T07:10:00+01:00`
  - `2013-02-07T06:05:00+01:00`

Expected behavior:

- Sort before processing.
- Total equals scenario 3 (`35`).

### 9. Invalid input

Input examples:

- Missing `vehicleType`
- Malformed timestamp, e.g. `2013-02-07 07:10`

Expected behavior:

- Return explicit validation error with actionable message.