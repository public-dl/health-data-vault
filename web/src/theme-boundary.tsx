import React from 'react';
/** A failed chart must leave theme selection and the page navigation usable. */
export class ThemeBoundary extends React.Component<{children:React.ReactNode;theme:string;resetKey?:string},{failed:boolean;resetKey?:string}>{
 state={failed:false,resetKey:this.props.resetKey};
 static getDerivedStateFromProps(props:{resetKey?:string},state:{resetKey?:string}){return props.resetKey!==state.resetKey?{failed:false,resetKey:props.resetKey}:null;}
 static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(error:Error,info:React.ErrorInfo){console.error('[HDV theme rendering]',error,info.componentStack);}
 render(){return this.state.failed?<section className="panel" role="alert"><h2>このテーマを表示できませんでした</h2><p>「{this.props.theme}」の表示中に問題が発生しました。テーマ選択から別のテーマへ切り替えられます。</p><button type="button" onClick={()=>this.setState({failed:false})}>もう一度表示する</button></section>:this.props.children;}
}
