import { ConfigProvider, Spin } from 'antd';
import Router from './router'
import 'antd/dist/reset.css';
import './style.scss'
import { PropagateLoader } from 'react-spinners';

// Set global indicator for Ant Design Spin components
Spin.setDefaultIndicator(<PropagateLoader color="#5b6cf9" size={10} />);

function App() {
    const customIndicator = <PropagateLoader color="#5b6cf9" size={10} />;

    return (
        <ConfigProvider
            theme={{
                token: {
                    fontSize: 12, // Baseline for Ant Design components
                    fontFamily: '"DM Sans", sans-serif',
                },
            }}
            spin={{ indicator: customIndicator }}
        >
            <Router />
        </ConfigProvider>
    );
}

export default App
