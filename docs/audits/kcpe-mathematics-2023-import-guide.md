# KCPE Mathematics 2023 Kenya - Import Guide

This guide documents the import process for the KCPE Mathematics 2023 exam into the XamPreps V2 system.

## Overview

The KCPE Mathematics 2023 exam has been successfully prepared for import into the XamPreps V2 Firestore system. This import includes:

- 1 exam document
- 1 section (Section A)
- 1 instruction group
- 50 items (questions)
- 50 interactions (MCQ Single)
- 50 marking rules
- 50 model answer versions with explanations

## Import Package Structure

The import package is located at:
- `docs/data/kcpe-mathematics-2023-kenya-v2-import.json` - Complete import package
- `docs/data/kcpe-mathematics-2023-kenya-answer-key.md` - Answer key with explanations

## Import Script

The import script is located at:
- `scripts/import-kcpe-mathematics-2023.mjs`

### Running the Import

```bash
# Navigate to the project root
cd /path/to/xampreps

# Run the import script
node scripts/import-kcpe-mathematics-2023.mjs
```

### Expected Output

The script will output progress information and a summary:

```
🚀 Starting KCPE Mathematics 2023 Kenya import...

1. Creating Exam...
   ✅ Exam created with ID: [exam-id]

2. Creating Sections...
   ✅ Created 1 section(s)

3. Creating Instruction Groups...
   ✅ Created 1 instruction group(s)

4. Creating Items...
   ✅ Created 50 item(s)

5. Creating Interactions...
   ✅ Created 50 interaction(s)

6. Creating Marking Rules...
   ✅ Created 50 marking rule(s)

7. Creating Model Answer Versions...
   ✅ Created 50 model answer version(s)

📊 Import Summary:
   Exams: 1
   Sections: 1
   Instruction Groups: 1
   Items: 50
   Interactions: 50
   Marking Rules: 50
   Model Answer Versions: 50

🎉 Import completed successfully!
   Exam ID: [exam-id]
   You can now access the exam in the XamPreps V2 system.
```

## Validation Commands

After import, you can validate the data using these commands:

```bash
# Check exam exists
firebase firestore:get /exams/[exam-id]

# Check sections
firebase firestore:get /sections --filter="examId=='[exam-id]'"

# Check items
firebase firestore:get /items --filter="examId=='[exam-id]'" | wc -l

# Check interactions
firebase firestore:get /interactions --filter="examId=='[exam-id]'" | wc -l

# Check marking rules
firebase firestore:get /marking_rules | wc -l

# Check model answer versions
firebase firestore:get /model_answer_versions | wc -l
```

## Manual Testing

After import, test the following:

1. **Exam Access**: Navigate to the exam in the dashboard
2. **Section Navigation**: Verify Section A displays correctly
3. **Question Display**: Check all 50 questions render properly
4. **Answer Options**: Verify all MCQ options are displayed
5. **Submission**: Test answering and submitting questions
6. **Results**: Verify scoring and feedback work correctly
7. **Explanations**: Check that model answers and explanations are shown

## Troubleshooting

### Common Issues

1. **Firebase Authentication Required**
   - Ensure you're logged into Firebase CLI
   - Run `firebase login` if needed

2. **Missing Dependencies**
   - Ensure all required packages are installed
   - Check package.json for dependencies

3. **Network Issues**
   - Ensure stable internet connection
   - Check Firebase project access

4. **Permission Errors**
   - Verify Firestore rules allow write access
   - Check service account permissions

### Error Recovery

If the import fails:
1. Check the error message for specific details
2. Verify all required files exist
3. Ensure Firebase project is properly configured
4. Check network connectivity
5. Try running the script again

## Post-Import Tasks

1. **Data Validation**: Run validation commands to verify import
2. **Manual Testing**: Test the exam functionality thoroughly
3. **Performance Check**: Ensure the exam loads and performs well
4. **Documentation**: Update any relevant documentation
5. **Backup**: Consider backing up the imported data

## Files Created

The import creates the following documents in Firestore:

### Collections
- `/exams/[exam-id]` - Exam metadata
- `/sections/[section-id]` - Section A
- `/instruction_groups/[ig-id]` - Question instructions
- `/items/[item-id]` - 50 question items
- `/interactions/[int-id]` - 50 MCQ interactions
- `/marking_rules/[mr-id]` - 50 marking rules
- `/model_answer_versions/[mav-id]` - 50 model answer versions

### Data Structure
Each document follows the V2 schema with proper relationships and references.

## Support

For issues with this import:
1. Check the troubleshooting section above
2. Review the error logs
3. Verify all prerequisites are met
4. Contact the development team if issues persist