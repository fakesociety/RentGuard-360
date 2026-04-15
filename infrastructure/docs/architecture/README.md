
# Architecture (Section 4A)

This folder contains the **diagram source** used to generate the architecture page (4A).

- High-level (few arrows) + explicit Step Functions steps: `eraser_architecture_high_level_steps.txt`
- Detailed (original style + corrected flows): `eraser_architecture_original_fixed.txt`

## Why these versions are safer for full credit

- Shows the correct upload flow (presigned URL: client uploads directly to S3)
- Shows the correct trigger path (S3 -> EventBridge Rule -> Step Functions)
- Shows Step Functions orchestration (StepF calls each Lambda; Lambdas don’t call each other)
- Includes Cognito PostConfirmation trigger (`AutoVerifySES`) that exists in the final stack

## Submission tip

Export the Eraser diagram as PNG/PDF and place it as page 4A, and attach the source file from this folder as the “diagram source”.

