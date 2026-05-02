import { render } from 'solid-js/web';
import App from './App';
import 'virtual:uno.css';
import './global.css';

render(() => <App />, document.getElementById('app')!);
