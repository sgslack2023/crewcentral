import React from 'react';
import { Chart } from "react-google-charts";
import dayjs from 'dayjs';

interface GoogleCalendarChartProps {
    data: any[];
}

const GoogleCalendarChart: React.FC<GoogleCalendarChartProps> = ({ data }) => {
    if (!data || !Array.isArray(data)) return null;

    // Aggregate data by day for count and tooltips
    const dayData: Record<string, { count: number, titles: string[] }> = {};
    data.forEach(item => {
        const dateStr = dayjs(item.start).format('YYYY-MM-DD');
        if (!dayData[dateStr]) {
            dayData[dateStr] = { count: 0, titles: [] };
        }
        dayData[dateStr].count += 1;
        if (item.title) {
            dayData[dateStr].titles.push(item.title);
        }
    });

    const chartData = [
        [
            { type: "date", id: "Date" },
            { type: "number", id: "Visit Count" },
            { type: "string", role: "tooltip", p: { html: true } }
        ],
        ...Object.entries(dayData).map(([date, info]) => [
            new Date(date),
            info.count,
            `Date: ${dayjs(date).format('MMM D, YYYY')}\nVisits: ${info.count}\n${info.titles.join('\n')}`
        ])
    ];

    return (
        <div style={{ width: '100%', height: '100%', minHeight: '150px' }}>
            <Chart
                chartType="Calendar"
                width="100%"
                height="100%"
                data={chartData}
                options={{

                    noDataColor: "#f4f4f4",
                    calendar: {
                        cellColor: {
                            stroke: '#f0f0f0',
                            strokeOpacity: 0.5,
                            strokeWidth: 1,
                        },
                        focusedCellColor: {
                            stroke: '#5b6cf9',
                            strokeOpacity: 1,
                            strokeWidth: 1,
                        }
                    },
                    colorAxis: {
                        colors: ['#e6f7ff', '#1890ff', '#5b6cf9']
                    }
                }}
            />
        </div>
    );
};

export default GoogleCalendarChart;
