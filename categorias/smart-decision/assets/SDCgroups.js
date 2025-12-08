window.GROUPS = [
  {
    id: "sdc-01-ppn",
    name: "SDC-01-PPN - Funcef - Conversão de código para SAS Viya",
    color: "#8b86ff",
    icon: "assets/SDC-01-PPN.svg",   // ajuste se usar outro nome/ícone
    iconHref: "https://sas.funcef.com.br/SASStudio/",
    collapsed: true,
    items: [
      {
        code: "M01",
        label:"Perplexity",
        provider:"Perplexity.AI", 
        url:"https://www.perplexity.ai/search/voce-me-ajudara-com-codigos-sa-DJTWzcVNRN2p0t8YZl3csg", 
        checked:true,
        img: "",
        TabTitle: ""
      },
      {
        code: "M02",
        label:"GPT 4.1",
        provider: "AdaptaONE",       
        url:"https://app.adapta.one/chats/6d483448-95d7-4382-b0ee-0c32babc5011", 
        checked:true, 
        img: "",
        TabTitle: ""
      },
      { 
        code: "M03",
        label:"Gemini 3.5 Pro",
        provider: "AdaptaONE26", 
        url:"https://agent.adapta.one/agentic-chat/019ab154-8234-7418-8b41-f6cff3d6a1e1", 
        checked:true,
        img: "",
        TabTitle: ""
      },
      { 
        code: "M04",
        label:"Mistral Large 2",
        provider: "Inner.AI",   
        url:"https://app.innerai.com/projects/44c35fb6-86ae-476e-b9db-344298309256?sessionId=0ebf41e3-3be8-4efd-8b01-a61e4e66622e", 
        checked:true,
        img: "",
        TabTitle: ""
      },
      {
        code: "M05",
        label:"gpt-oss-120B",
        provider: "HuggingFace",   
        url: "https://huggingface.co/chat/conversation/69232860f0bcb3333f38faf7", 
        checked:true,
        img: "",
        TabTitle: ""
      },
      {
        code: "SUP",
        label:"ChatGPT 5.1", 
        provider: "openAI",        
        url:"https://chatgpt.com/g/g-p-68d1a221aa7c8191b511bad53ebfa07f/c/68f804ca-b6dc-832d-921b-0c40b9413a5b", 
        checked:true,
        img: "",
        TabTitle: ""
      },
      {
        code: "REV",
        label:"o3 mini high",
        provider:"Tess.AI",      
        url:"https://tess.pareto.io/pt-BR/dashboard/user/ai/chat/ai-chat?_chat_id=13973225&tools=tools", 
        checked:true,
        img: "",
        TabTitle: ""
      }
    ]
  }
];