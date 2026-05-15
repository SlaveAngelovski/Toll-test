# Assignment Specification

## Objective

Build a toll fee calculator for a city traffic system.

The calculator should return the **total daily toll fee** for a vehicle based on passage timestamps and the fee rules in this document.
How this calculator works is totally up to you. One example would be that it calculates and presents data provided from backend AND that users are to enter data and table thus should update accordingly.

This is intentionally scoped as a realistic engineering exercise: clear enough to start quickly, open enough to show design and tradeoff thinking.
A backend is provided with mocked data. It is fine to modify it in your solution.

## Time Box

- Suggested implementation time: **1-2 days**
- Suggested documentation/prep time: **up to 45 minutes**
- This is a guideline for scope and fairness, not a strict hard cutoff.

At Shape Games we value code that is easy to follow rather than **focusing on solving the problem**. Clear reasoning, structure and engineering quality are required.

## Follow-Up Discussion (In Person)

The exercise includes a physical follow-up meeting to discuss your solution.

In this discussion, be prepared to:

- Walk through your solution and explain key design decisions.
- Explain tradeoffs and assumptions you made.
- Describe how you would improve the solution with more time.
- Explain how your approach could scale (for example: traffic volume, maintainability, reliability, operability).

Part of the assignment is your ability to communicate technical decisions, not only the submitted code.

## Core Rules

### 1. Fee schedule (DKK)

| Time interval (local time) | Fee |
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

### 2. One charge per 60-minute window

- Passages are grouped in rolling windows.
- A window starts at the first unprocessed passage.
- Any passage that occurs within 60 minutes from that start belongs to the same window.
- Charge only the highest fee in that window.

### 3. Daily cap

- Maximum total fee per vehicle per calendar day: **120 DKK**.

### 4. Bonus in this task is if you handle toll-free vehicles that have passed through

- `Motorbike`
- `Tractor`
- `Emergency`
- `Military`

### 5. Toll-free dates

- Saturdays and Sundays.
- Public holidays for this exercise (2025 table):
    - 1 Jan
    - 17-21 Apr
    - 29 May
    - 8-9 June
    - 24-26 december

If you make holiday handling configurable or year-agnostic, document your approach.


### Request type

`DailyTollRequest`

- `vehicleType: string`
- `passages: PassageEvent[]`

`PassageEvent`

- `timestamp: string` (ISO-8601, must include timezone offset)

### Response type

`DailyTollResponse`

- `date: string` (`YYYY-MM-DD`)
- `totalFeeDkk: number`
- `chargedPassages?: ChargedPassage[]` (optional but recommended)
- `notes?: string[]` (optional assumptions/validation notes)

`ChargedPassage` (optional)

- `windowStart: string`
- `windowEnd: string`
- `appliedFeeDkk: number`
- `triggeringTimestamp: string`

Optional: Add API targets for your own needs:

## Validation and Assumptions

Default assumptions for this exercise:

- Timezone for rule evaluation: timestamp timezone (do not assume UTC unless you convert intentionally and document it).
- Calendar day boundary: local calendar day from the evaluated timezone.
- Input ordering: may be unsorted; sort before processing.
- Input may contain invalid records; define your strategy and document it.

Recommended validation behavior:

- Reject malformed timestamps and missing vehicle type with a clear error.
- If passages span multiple dates, either:
  - reject with a clear message, or
  - split by date and return one response per date.

Choose one behavior and document it.

## Deliverables

Required:

- Runnable code in Typescript and React language.
- `README` in your submission repository with:
  - Setup and run instructions
  - Assumptions
  - Tradeoffs
  - Improvements and scalability notes for discussion
  - What you would do next with more time
- Tests or a clear test strategy explanation.

Optional but valuable:

- Explanation of architecture choices:
  - Describe your main components/modules and the boundaries between them.
  - Call out at least one key tradeoff and one alternative you considered.
  - Explain how your design could evolve (for example: configurable rules, more traffic, multi-day requests).
- Observability/error-reporting notes:
  - State what you would log at info/warn/error level and what you would avoid logging.
  - Propose a minimal metric set (for example: request count, latency, error rate, validation failures).
  - Describe how errors are surfaced to callers/users (clear status codes/messages) and how you would debug failures.

## What You May Choose Freely

- Framework to use on top of React.
- Project structure and naming.
- Test tooling and depth.

## Out of scope

- Building a full production platform.
- Creating full authentication or deployment pipelines.