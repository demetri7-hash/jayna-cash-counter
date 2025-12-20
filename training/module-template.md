# Training Module Template

Use this template to structure each day of your 30-day training program.

## Day [NUMBER]: [TITLE]

**Duration:** [e.g., 2 hours, 3 hours, 1.5 hours]

**Description:** [1-2 sentence overview of what this day covers]

### Learning Objectives
By the end of this module, trainees will be able to:
- Objective 1
- Objective 2
- Objective 3
- Objective 4

### Activities & Tasks
1. Activity 1 - [Description and time estimate]
2. Activity 2 - [Description and time estimate]
3. Activity 3 - [Description and time estimate]
4. Hands-on practice - [What will they actually do?]

### Required Resources
- Resource 1 (e.g., "Employee Handbook PDF - pages 5-12")
- Resource 2 (e.g., "Food Safety Video - 15 minutes")
- Resource 3 (e.g., "POS System Quick Reference Guide")
- Resource 4 (e.g., "Sample customer scenarios worksheet")

### Knowledge Check (Optional)
1. Question 1 - [Multiple choice or short answer]
2. Question 2
3. Question 3

### Trainer Notes
- [Any special instructions for the trainer/manager]
- [Equipment or materials needed]
- [Common mistakes to watch for]

---

## JavaScript Object Format

Once completed, convert to this format for `training.html`:

```javascript
{
    day: [NUMBER],
    title: "[TITLE]",
    description: "[DESCRIPTION]",
    duration: "[DURATION]",
    status: "locked", // Will unlock sequentially
    content: {
        objectives: [
            "Objective 1",
            "Objective 2",
            "Objective 3"
        ],
        activities: [
            "Activity 1 description",
            "Activity 2 description",
            "Activity 3 description"
        ],
        resources: [
            "Resource 1",
            "Resource 2",
            "Resource 3"
        ],
        quiz: [
            {
                question: "Question 1 text?",
                options: ["A", "B", "C", "D"],
                correct: 2 // Index of correct answer (0-based)
            }
        ]
    }
}
```

---

## Example: Day 1 - Welcome & Restaurant Overview

**Duration:** 2 hours

**Description:** Introduction to Jayna Gyro, our mission, values, and culture. Understanding our place in the Sacramento community.

### Learning Objectives
By the end of this module, trainees will be able to:
- Explain Jayna Gyro's history and mission statement
- Describe our core menu items and Mediterranean cuisine focus
- Identify key team members and organizational structure
- Recall basic employee policies and expectations

### Activities & Tasks
1. Watch "Welcome to Jayna Gyro" video (15 minutes)
2. Complete facility tour with manager (30 minutes)
3. Review employee handbook sections 1-3 (45 minutes)
4. Fill out new hire paperwork and I-9 forms (30 minutes)

### Required Resources
- Welcome video (YouTube link or local file)
- Employee Handbook PDF
- Facility map
- New hire paperwork packet

### Knowledge Check
1. What year was Jayna Gyro founded?
   - A) 2010
   - B) 2015
   - C) 2018
   - D) 2020

2. What is our signature menu item?
   - A) Pizza
   - B) Gyros
   - C) Burgers
   - D) Tacos

3. Who should you report equipment malfunctions to?
   - A) Any coworker
   - B) The manager on duty
   - C) The owner directly
   - D) Wait until next shift

### Trainer Notes
- Ensure new hire feels welcomed and comfortable
- Introduce them to at least 3 team members by name
- Have them shadow a senior employee during their first break
- Check for understanding before moving to Day 2

---

**Paste your completed modules into training.html starting around line 215!**
