import { useState } from 'react'
import AuthComponent from '../components/AuthComponent'
import { CustomAxiosError, DataProps } from '../utils/types'
import axios from 'axios'
import { fullname, id, role, tokenName, email } from '../utils/data'

import { LoginUrl } from '../utils/network'
import { Modal } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/hooks'

interface LoginDataProps {
    data: {
        access: string,
        id: number,
        role: string,
        fullname: string,

    }
}

function Login() {

    const [loading, setLoading] = useState(false)
    const [errorModal, setErrorModal] = useState<{
        visible: boolean;
        message: string;
    }>({
        visible: false,
        message: ''
    });
    const history = useNavigate()

    useAuth({
        successCallBack: () => {
            history("/")
        }
    })

    const onSubmit = async (values: DataProps) => {
        setLoading(true)
        try {
            const response = await axios.post(LoginUrl, values);

            if (response && response.data) {
                localStorage.setItem(tokenName, response.data.access)
                localStorage.setItem(id, response.data.id.toString());
                localStorage.setItem(role, response.data.role);
                localStorage.setItem(fullname, response.data.fullname);
                localStorage.setItem(email, response.data.email);

                // Store organizations
                localStorage.setItem('user_organizations', JSON.stringify(response.data.organizations || []));

                // Set default organization context
                const orgs = response.data.organizations || [];
                if (orgs.length > 0) {
                    const defaultOrg = orgs.find((o: any) => o.is_default) || orgs[0];
                    localStorage.setItem('current_org_id', defaultOrg.id.toString());
                }

                history("/")
            }
        } catch (e: any) {
            console.log('Login error caught:', e);
            console.log('Error response:', e.response?.data);

            const errorMessage = e.response?.data?.error || "An error occurred during login";
            console.log('Showing modal with message:', errorMessage);

            // Show error modal
            setErrorModal({
                visible: true,
                message: errorMessage
            });
        }
        setLoading(false)
    }
    return (
        <>
            <AuthComponent onSubmit={onSubmit} loading={loading} />

            {/* Error Modal */}
            <Modal
                title="Login Error"
                open={errorModal.visible}
                onOk={() => setErrorModal({ visible: false, message: '' })}
                onCancel={() => setErrorModal({ visible: false, message: '' })}
                footer={[
                    <button
                        key="ok"
                        onClick={() => setErrorModal({ visible: false, message: '' })}
                        style={{
                            backgroundColor: '#ff4d4f',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        OK
                    </button>
                ]}
                centered
                width={400}
            >
                <p style={{ fontSize: '14px', lineHeight: '1.5' }}>
                    {errorModal.message}
                </p>
            </Modal>
        </>
    )

}
export default Login