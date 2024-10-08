import React, { useState, useEffect } from 'react';
import { Card, message, Select, Skeleton, Tooltip } from 'antd';
import { ResponsiveRadar } from '@nivo/radar';
import axios from 'axios';
import moment from 'moment';

const UsageTrends = ({ loading, itemSuggestions, mostUsedItem }) => {
    const [selectedItems, setSelectedItems] = useState([]);
    const [usageData, setUsageData] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [highlightedItem, setHighlightedItem] = useState(null);

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
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/use-history`);
            setUsageData(response.data || []);
        } catch (error) {
            message.error('Error fetching usage data');
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
        setHighlightedItem(null);
    };

    const handleLegendClick = (itemId) => {
        setHighlightedItem(itemId === highlightedItem ? null : itemId);
    };

    const emptyChartData = [
        { month: 'January', empty: 0 },
        { month: 'February', empty: 0 },
        { month: 'March', empty: 0 },
        { month: 'April', empty: 0 },
        { month: 'May', empty: 0 },
        { month: 'June', empty: 0 },
        { month: 'July', empty: 0 },
        { month: 'August', empty: 0 },
        { month: 'September', empty: 0 },
        { month: 'October', empty: 0 },
        { month: 'November', empty: 0 },
        { month: 'December', empty: 0 },
    ];

    const expandedColors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
        '#3EC1D3', '#F85F73', '#55E6C1', '#F7D794', '#82589F'
    ];

    useEffect(() => {
    }, [selectedItems, highlightedItem]);

    const colors = ({ key }) => {
        if (highlightedItem) {
            return key === highlightedItem
                ? expandedColors[selectedItems.indexOf(key) % expandedColors.length]
                : '#e0e0e0';
        }
        return expandedColors[selectedItems.indexOf(key) % expandedColors.length];
    };

    return (
        <Card title="Usage Trends" style={{ marginBottom: 24 }}>
            {loading ? (
                <Skeleton active />
            ) : (
                <>
                    <Select
                        mode="multiple"
                        style={{ width: '100%', marginBottom: 16 }}
                        placeholder="Select items to compare"
                        onChange={handleItemSelect}
                        value={selectedItems}
                        options={itemSuggestions.map(item => ({
                            value: item.itemid,
                            label: (
                                <Tooltip title={item.comment ? item.comment : ''}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>{`${item.itemid} - ${item.description}`}</span>
                                        <span style={{ fontStyle: 'italic', textAlign: 'right' }}>
                                            {` ${item.material}`}
                                        </span>
                                    </div>
                                </Tooltip>
                            ),
                        }))}
                    />
                    <div style={{ height: 400 }}>
                        <ResponsiveRadar
                            data={selectedItems.length === 0 ? emptyChartData : chartData}
                            keys={selectedItems.length === 0 ? ['empty'] : selectedItems}
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
                            colors={colors}
                            fillOpacity={0.25}
                            blendMode="multiply"
                            animate={false}
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
                                    ],
                                    onClick: (legend) => handleLegendClick(legend.id),
                                    data: selectedItems.map(item => ({
                                        id: item,
                                        label: item
                                    }))
                                }
                            ]}
                        />
                    </div>
                </>
            )}
        </Card>
    );
};

export default UsageTrends;
