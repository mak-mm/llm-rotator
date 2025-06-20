# Performance Optimization: Parallel Fragment Processing

## Overview
We've significantly improved the query processing speed by implementing parallel fragment distribution to LLM providers.

## What Changed

### Before: Sequential Processing
```python
# Process fragments one by one
for idx, fragment in enumerate(fragments):
    response = await provider.generate(request)  # Wait for each one
    fragment_responses.append(response)
```
- Fragments were sent to providers one at a time
- Total time = Sum of all fragment processing times
- Example: 3 fragments × 2 seconds each = 6 seconds total

### After: Parallel Processing
```python
# Process all fragments in parallel
fragment_tasks = [process_fragment(fragment, idx) for idx, fragment in enumerate(fragments)]
fragment_responses = await asyncio.gather(*fragment_tasks)
```
- All fragments are sent to providers simultaneously
- Total time = Time of the slowest fragment
- Example: 3 fragments processed in parallel = ~2 seconds total (3x faster!)

## Benefits

1. **Speed Improvement**: 
   - Processing time reduced by up to N× (where N = number of fragments)
   - Typical 3-5x speedup for multi-fragment queries

2. **Better Resource Utilization**:
   - All LLM providers work simultaneously
   - No idle waiting time between fragments

3. **Improved User Experience**:
   - Faster response times
   - More responsive application

4. **Cost Efficiency**:
   - Same API costs but faster results
   - Better throughput for high-volume scenarios

## Technical Implementation

The parallel processing happens in `src/api/background_tasks.py`:
- Uses Python's `asyncio.gather()` to run all fragment tasks concurrently
- Each fragment is processed in its own coroutine
- Results are collected when all fragments complete
- Progress updates show "parallel processing" status

## Monitoring

The system now logs:
- Parallel processing start time
- Individual fragment completion times
- Total parallel processing time
- Comparison with sequential estimate

Example log output:
```
[request-123] Starting PARALLEL processing of 3 fragments
[request-123] Fragment 1/3 completed by OPENAI in 1.85s
[request-123] Fragment 2/3 completed by ANTHROPIC in 2.10s
[request-123] Fragment 3/3 completed by GOOGLE in 1.95s
[request-123] PARALLEL processing completed in 2.10s (vs sequential estimate: 6.30s)
```

This optimization maintains all the privacy benefits while significantly improving performance!