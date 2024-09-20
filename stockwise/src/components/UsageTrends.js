import React, { useState, useEffect } from 'react';
import { Card, Select, Spin } from 'antd';
import { ResponsiveRadar } from '@nivo/radar';
import axios from 'axios';
import moment from 'moment';

const { Option } = Select;

const UsageTrends = ({ loading, itemSuggestions, mostUsedItem }) => {
    const [selectedItems, setSelectedItems] = useState([]);
    const [usageData, setUsageData] = useState([]);
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        if (!loading && mostUsedItem) {
            setSelectedItems([mostUsedItem.itemid]);
        }
    }, [loading, mostUsedItem]);

    useEffect(() => {
        if (!loading && selectedItems.length > 0) {
            fetchUsageData();
        }
    }, [loading, selectedItems]);

    const fetchUsageData = async () => {
        try {
            const response = await axios.get('http://localhost:4000/use-history');
            setUsageData(response.data || []);
        } catch (error) {
            console.error('Error fetching usage data:', error);
        }
    };

    useEffect(() => {
        if (usageData.length > 0 && selectedItems.length > 0) {
            const processedData = processUsageData();
            setChartData(processedData);
        } else {
            setChartData([]);
        }
    }, [usageData, selectedItems]);

    const processUsageData = () => {
        const monthNames = moment.months();
        const currentMonth = moment().month();
        const last12Months = Array.from({ length: 12 }, (_, i) =>
            monthNames[(currentMonth - i + 12) % 12]
        ).reverse();

        const itemUsage = selectedItems.reduce((acc, item) => {
            acc[item] = Object.fromEntries(last12Months.map(month => [month, 0]));
            return acc;
        }, {});

        usageData.forEach(entry => {
            const entryMonth = moment(entry.dateUsed).format('MMMM');
            entry.items.forEach(item => {
                if (selectedItems.includes(item.itemId)) {
                    itemUsage[item.itemId][entryMonth] += item.quantityUsed;
                }
            });
        });

        return last12Months.map(month => {
            const dataPoint = { month };
            selectedItems.forEach(item => {
                dataPoint[item] = itemUsage[item][month] || 0;
            });
            return dataPoint;
        });
    };

    const handleItemSelect = (selectedItems) => {
        setSelectedItems(selectedItems);
    };

    return (
        <Card title="Usage Trends" style={{ marginBottom: 24 }}>
            {loading ? (
                <Spin spinning={loading}></Spin>
            ) : (
                <>
                    <Select
                        mode="multiple"
                        style={{ width: '100%', marginBottom: 16 }}
                        placeholder="Select items to compare"
                        onChange={handleItemSelect}
                        value={selectedItems}
                        options={itemSuggestions.map(item => ({
                            label: `${item.itemid} - ${item.description}`,
                            value: item.itemid
                        }))}
                    />
                    {chartData.length > 0 ? (
                        <div style={{ height: 400 }}>
                            <ResponsiveRadar
                                data={chartData}
                                keys={selectedItems}
                                indexBy="month"
                                maxValue="auto"
                                margin={{ top: 70, right: 80, bottom: 40, left: 80 }}
                                curve="linearClosed"
                                borderWidth={2}
                                borderColor={{ from: 'color' }}
                                gridLevels={5}
                                gridShape="circular"
                                gridLabelOffset={36}
                                enableDots={true}
                                dotSize={10}
                                dotColor={{ theme: 'background' }}
                                dotBorderWidth={2}
                                dotBorderColor={{ from: 'color' }}
                                enableDotLabel={true}
                                dotLabel="value"
                                dotLabelYOffset={-12}
                                colors={{ scheme: 'nivo' }}
                                fillOpacity={0.25}
                                blendMode="multiply"
                                animate={true}
                                motionConfig="wobbly"
                                isInteractive={true}
                                legends={[
                                    {
                                        anchor: 'top-left',
                                        direction: 'column',
                                        translateX: -50,
                                        translateY: -40,
                                        itemWidth: 80,
                                        itemHeight: 20,
                                        itemTextColor: '#999',
                                        symbolSize: 12,
                                        symbolShape: 'circle',
                                        effects: [
                                            {
                                                on: 'hover',
                                                style: {
                                                    itemTextColor: '#000'
                                                }
                                            }
                                        ]
                                    }
                                ]}
                            />
                        </div>
                    ) : null}
                </>
            )}
        </Card>
    );
};

export default UsageTrends;