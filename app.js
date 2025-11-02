import express from 'express';
import dotenv from 'dotenv';
import { createTransport } from 'nodemailer';
import cron from 'node-cron';
import axios from 'axios';


if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const transporter = createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
    },
});

app.get('/', async () => {
    try {
        const res = await axios.get(process.env.BACKEND_URL);
        const users = res.data.users;

        // console.log(users);

        for (const user of users) {
            console.log(user);
            let totalTopics = 0;
            let completedTopics = 0;
            let remainingTopics = 0;
            let overdueTopics = 0;
            let nextTopicTitle = null;

            for (const roadmap of user.roadmaps) {
                // console.log(roadmap);
                for (const section of roadmap.sections) {
                    // console.log(section);
                    for (const subtopic of section.subtopics) {
                        // console.log(subtopic);
                        totalTopics++;

                        if (subtopic.is_completed) {
                            completedTopics++;
                        } else {
                            remainingTopics++;

                            if (subtopic.due_date && new Date(subtopic.due_date) < new Date()) {
                                overdueTopics++;
                            }

                            if (!nextTopicTitle) {
                                nextTopicTitle = subtopic.title;
                            }
                        }
                    }
                }
            }

            // console.log("traversed all topics", user);


            await transporter.sendMail({
                from: process.env.EMAIL,
                to: user.email,
                subject: "Your Daily Roadmap Progress Update",
                html: emailHtml(user.username, {
                    totalTopics,
                    completedTopics,
                    remainingTopics,
                    overdueTopics,
                    nextTopicTitle
                }),
            });

            // console.log("all mails sent");
        }

        console.log("Daily progress emails sent successfully.");

    } catch (err) {
        console.error("Error sending daily progress emails:", err);
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})

const emailHtml = (username, roadmapSummary) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Roadmap Progress</title>
    <style>
        body {
            background-color: #fff;
            color: #212121;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            margin: 0;
            padding: 0;
        }
        .container {
            padding: 15px;
            margin: 0 auto;
            background-color: #f9f9f9;
            max-width: 600px;
            border-radius: 8px;
        }
        .header {
            background-color: #2E86DE;
            color: white;
            padding: 15px 20px;
            border-radius: 8px 8px 0 0;
            text-align: center;
            font-size: 18px;
            font-weight: bold;
        }
        .content {
            padding: 20px;
            background-color: #fff;
            border-radius: 0 0 8px 8px;
        }
        .section {
            margin-bottom: 15px;
        }
        .section h3 {
            margin: 0 0 5px 0;
            font-size: 16px;
            color: #333;
        }
        .section p {
            margin: 0;
            font-size: 14px;
            color: #555;
        }
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        .table th, .table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            font-size: 14px;
        }
        .table th {
            background-color: #f2f2f2;
        }
        .footer {
            margin-top: 20px;
            font-size: 11px;
            color: #666;
            text-align: center;
            line-height: 1.4;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">Daily Roadmap Progress Report</div>
        <div class="content">
            <p>Hi ${username},</p>
            <p>Here’s your roadmap progress update for today:</p>

            <div class="section">
                <h3>Overall Progress</h3>
                <table class="table">
                    <tr>
                        <th>Total Topics</th>
                        <th>Completed</th>
                        <th>Remaining</th>
                        <th>Overdue</th>
                    </tr>
                    <tr>
                        <td>${roadmapSummary.totalTopics}</td>
                        <td>${roadmapSummary.completedTopics}</td>
                        <td>${roadmapSummary.remainingTopics}</td>
                        <td>${roadmapSummary.overdueTopics}</td>
                    </tr>
                </table>
            </div>

            <div class="section">
                <h3>Next Topic to Complete</h3>
                <p>${roadmapSummary.nextTopicTitle ?? "All topics completed!"}</p>
            </div>

            <p>Keep up the great work and stay on track!</p>
        </div>

        <div class="footer">
            This message was automatically generated by your Roadmap Tracker. Do not reply to this email.<br>
            &copy; 2025 Roadmap Tracker. All rights reserved.
        </div>
    </div>
</body>
</html>
`;