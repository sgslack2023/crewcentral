import React, { FC, useState } from 'react';
import { Form, Input, Button, Card, Rate, Typography, message, Result } from 'antd';
import { SmileOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { FeedbackUrl } from '../utils/network';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const PublicFeedback: FC = () => {
    const { token } = useParams<{ token: string }>();
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [rating, setRating] = useState(0);

    const onFinish = async (values: any) => {
        if (!token) {
            message.error("Invalid feedback link");
            return;
        }

        if (rating === 0) {
            message.error("Please select a rating");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(`${FeedbackUrl}/submit_public`, {
                token: token,
                rating: rating,
                comment: values.comment,
                source: 'Web',
            });

            const { google_business_link } = response.data;

            // Redirection logic: if rating >= 4 and link exists, redirect after short delay
            if (rating >= 4 && google_business_link) {
                message.success("Thank you! Redirecting you to leave a review on Google...");
                setTimeout(() => {
                    window.location.href = google_business_link;
                }, 2000);
            } else {
                setSubmitted(true);
            }
        } catch (error) {
            console.error(error);
            message.error("Failed to submit feedback. The link might be invalid or expired.");
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div style={{
                minHeight: '100vh',
                background: '#f0f2f5',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '20px'
            }}>
                <Card style={{ width: '100%', maxWidth: 600, borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <Result
                        status="success"
                        icon={<CheckCircleOutlined style={{ color: '#1890ff' }} />}
                        title="Thank You for Your Feedback!"
                        subTitle="We appreciate you taking the time to rate our service. Your feedback helps us improve."
                    />
                </Card>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px'
        }}>
            <Card
                style={{
                    width: '100%',
                    maxWidth: 500,
                    borderRadius: '16px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    overflow: 'hidden'
                }}
                bodyStyle={{ padding: '40px 30px' }}
            >
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <Title level={2} style={{ color: '#333', marginBottom: '10px' }}>How did we do?</Title>
                    <Paragraph type="secondary">
                        Please rate your experience with Baltic Van Lines.
                    </Paragraph>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{ marginBottom: '15px' }}>
                        {rating >= 4 ? (
                            <SmileOutlined style={{ fontSize: '48px', color: '#52c41a', transition: 'all 0.3s' }} />
                        ) : rating > 0 && rating < 4 ? (
                            <SmileOutlined style={{ fontSize: '48px', color: '#faad14', transition: 'all 0.3s' }} />
                        ) : (
                            <SmileOutlined style={{ fontSize: '48px', color: '#d9d9d9', transition: 'all 0.3s' }} />
                        )}
                    </div>

                    <Rate
                        style={{ fontSize: '36px', color: '#1890ff' }}
                        onChange={setRating}
                        value={rating}
                    />

                    <div style={{ marginTop: '10px' }}>
                        <Text strong style={{ color: rating > 0 ? '#1890ff' : '#d9d9d9' }}>
                            {rating === 1 ? "Terrible" :
                                rating === 2 ? "Bad" :
                                    rating === 3 ? "Okay" :
                                        rating === 4 ? "Good" :
                                            rating === 5 ? "Excellent!" : "Select a rating"}
                        </Text>
                    </div>
                </div>

                <Form
                    layout="vertical"
                    onFinish={onFinish}
                >
                    <Form.Item
                        name="comment"
                        label="Tell us more (optional)"
                    >
                        <TextArea
                            rows={4}
                            placeholder="What did you like? What can we do better?"
                            style={{ borderRadius: '8px', resize: 'none' }}
                        />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            size="large"
                            loading={loading}
                            style={{
                                height: '50px',
                                borderRadius: '8px',
                                background: '#1890ff',
                                fontSize: '16px',
                                fontWeight: 600
                            }}
                        >
                            Submit Feedback
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default PublicFeedback;
