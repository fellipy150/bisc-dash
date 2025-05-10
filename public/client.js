// Variáveis globais
let currentUser = null;
let currentGuildId = null;
let allGuilds = [];
let guildChannels = {};

// Elementos DOM frequentemente acessados
const elementsCache = {};

// Função auxiliar para obter elementos DOM
function getElement(id) {
  if (!elementsCache[id]) {
    elementsCache[id] = document.getElementById(id);
  }
  return elementsCache[id];
}

// Função para verificar se o usuário está logado
async function checkLoginStatus() {
  try {
    const response = await fetch('/api/get_guilds');
    
    if (!response.ok) {
      // Se o status não for 200 OK, redirecionar para a página de login
      if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
        window.location.href = '/';
      }
      return false;
    }
    
    const data = await response.json();
    
    // Se temos uma resposta bem-sucedida, significa que o usuário está logado
    currentUser = data.user;
    return true;
  } catch (error) {
    console.error('Erro ao verificar status de login:', error);
    return false;
  }
}

// Função para buscar os servidores do usuário
async function fetchUserGuilds() {
  try {
    const response = await fetch('/api/get_guilds');
    
    if (!response.ok) {
      throw new Error('Não foi possível obter os servidores');
    }
    
    const data = await response.json();
    allGuilds = data.guilds || [];
    currentUser = data.user;
    
    return allGuilds;
  } catch (error) {
    console.error('Erro ao buscar servidores:', error);
    showStatusMessage('Erro ao carregar servidores. Por favor, tente novamente.', 'error');
    return [];
  }
}

// Função para exibir a lista de servidores
function displayGuildsList(guilds) {
  const serverListElement = getElement('server-list');
  
  if (!serverListElement) return;
  
  serverListElement.innerHTML = '';
  
  if (guilds.length === 0) {
    serverListElement.innerHTML = `
      <div class="card">
        <p>Você não possui servidores com permissão para gerenciar o bot.</p>
        <p>Para configurar o bot, você precisa ter permissão de "Gerenciar Servidor" ou ser um administrador.</p>
      </div>
    `;
    return;
  }
  
  guilds.forEach(guild => {
    const serverItem = document.createElement('div');
    serverItem.className = 'server-item';
    serverItem.dataset.id = guild.id;
    
    // Criar o avatar do servidor ou usar uma imagem padrão
    const avatarUrl = guild.icon 
      ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` 
      : 'https://cdn.discordapp.com/embed/avatars/0.png';
    
    serverItem.innerHTML = `
      <img src="${avatarUrl}" alt="${guild.name}" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
      <span>${guild.name}</span>
    `;
    
    serverItem.addEventListener('click', () => selectGuild(guild.id));
    serverListElement.appendChild(serverItem);
  });
}

// Função para selecionar um servidor
async function selectGuild(guildId) {
  if (currentGuildId === guildId) return;
  
  // Atualizar UI para mostrar o servidor selecionado
  const serverItems = document.querySelectorAll('.server-item');
  serverItems.forEach(item => {
    item.classList.remove('active');
    if (item.dataset.id === guildId) {
      item.classList.add('active');
    }
  });
  
  currentGuildId = guildId;
  
  // Mostrar a seção de configuração
  const configSections = document.querySelectorAll('.config-section');
  configSections.forEach(section => {
    section.classList.remove('active');
  });
  
  // Mostrar a seção de configuração de boas-vindas
  const welcomeConfigSection = getElement('welcome-config');
  if (welcomeConfigSection) {
    welcomeConfigSection.classList.add('active');
    
    // Carregar a configuração atual
    await loadWelcomeConfig(guildId);
  }
}

// Função para carregar a configuração de boas-vindas
async function loadWelcomeConfig(guildId) {
  showLoadingState(true);
  
  try {
    // Primeiro, vamos carregar os canais do servidor se ainda não tivermos
    if (!guildChannels[guildId]) {
      const channelsResponse = await fetch(`/api/welcome_config?guildId=${guildId}&action=get_channels`);
      
      if (channelsResponse.ok) {
        const channelsData = await channelsResponse.json();
        guildChannels[guildId] = channelsData.channels || [];
      } else {
        throw new Error('Não foi possível carregar os canais do servidor');
      }
    }
    
    // Agora, carregamos a configuração atual
    const response = await fetch(`/api/welcome_config?guildId=${guildId}`);
    
    if (!response.ok) {
      throw new Error('Não foi possível carregar a configuração');
    }
    
    const config = await response.json();
    
    // Preencher o formulário com os dados
    populateWelcomeForm(config, guildChannels[guildId]);
    
    showLoadingState(false);
  } catch (error) {
    console.error('Erro ao carregar configuração:', error);
    showStatusMessage('Erro ao carregar configuração. Por favor, tente novamente.', 'error');
    showLoadingState(false);
  }
}

// Função para preencher o formulário de boas-vindas
function populateWelcomeForm(config, channels) {
  const welcomeEnabled = getElement('welcome-enabled');
  const welcomeChannel = getElement('welcome-channel');
  const welcomeMessage = getElement('welcome-message');
  
  // Limpar o dropdown de canais e adicionar as opções
  welcomeChannel.innerHTML = '<option value="">Selecione um canal</option>';
  
  if (channels && channels.length > 0) {
    channels.forEach(channel => {
      if (channel.type === 0) { // 0 é o tipo para canais de texto
        const option = document.createElement('option');
        option.value = channel.id;
        option.textContent = `#${channel.name}`;
        welcomeChannel.appendChild(option);
      }
    });
  }
  
  // Preencher com a configuração atual, se existir
  if (config && config.welcome) {
    welcomeEnabled.checked = config.welcome.enabled || false;
    welcomeMessage.value = config.welcome.message || '';
    
    // Selecionar o canal correto no dropdown
    if (config.welcome.channelId) {
      welcomeChannel.value = config.welcome.channelId;
    }
  } else {
    // Valores padrão se não houver configuração
    welcomeEnabled.checked = false;
    welcomeMessage.value = 'Bem-vindo(a) {user} ao {server}! Esperamos que você se divirta conosco.';
    welcomeChannel.value = '';
  }
}

// Função para salvar a configuração de boas-vindas
async function saveWelcomeConfig(event) {
  event.preventDefault();
  
  if (!currentGuildId) {
    showStatusMessage('Por favor, selecione um servidor primeiro.', 'error');
    return;
  }
  
  const welcomeEnabled = getElement('welcome-enabled').checked;
  const welcomeChannelId = getElement('welcome-channel').value;
  const welcomeMessage = getElement('welcome-message').value;
  
  if (welcomeEnabled && (!welcomeChannelId || !welcomeMessage)) {
    showStatusMessage('Por favor, selecione um canal e escreva uma mensagem de boas-vindas.', 'error');
    return;
  }
  
  const config = {
    guildId: currentGuildId,
    welcome: {
      enabled: welcomeEnabled,
      channelId: welcomeChannelId,
      message: welcomeMessage
    }
  };
  
  showLoadingState(true);
  
  try {
    const response = await fetch('/api/welcome_config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });
    
    if (!response.ok) {
      throw new Error('Erro ao salvar configuração');
    }
    
    const data = await response.json();
    showStatusMessage('Configuração salva com sucesso!', 'success');
    
    // Atualizar a configuração local
    setTimeout(() => {
      loadWelcomeConfig(currentGuildId);
    }, 1000);
  } catch (error) {
    console.error('Erro ao salvar configuração:', error);
    showStatusMessage('Erro ao salvar configuração. Por favor, tente novamente.', 'error');
  } finally {
    showLoadingState(false);
  }
}

// Função para exibir mensagens de status
function showStatusMessage(message, type) {
  const statusElement = getElement('status-message');
  
  if (!statusElement) return;
  
  statusElement.textContent = message;
  statusElement.className = 'status-message';
  
  if (type === 'success') {
    statusElement.classList.add('status-success');
  } else if (type === 'error') {
    statusElement.classList.add('status-error');
  } else if (type === 'loading') {
    statusElement.classList.add('status-loading');
  }
  
  statusElement.style.display = 'block';
  
  // Esconder a mensagem após 5 segundos para tipos não-loading
  if (type !== 'loading') {
    setTimeout(() => {
      statusElement.style.display = 'none';
    }, 5000);
  }
}

// Função para mostrar ou esconder o estado de carregamento
function showLoadingState(isLoading) {
  const loaderElement = getElement('loader');
  const formButtons = document.querySelectorAll('button[type="submit"]');
  
  if (loaderElement) {
    loaderElement.style.display = isLoading ? 'block' : 'none';
  }
  
  // Desabilitar botões durante o carregamento
  formButtons.forEach(button => {
    button.disabled = isLoading;
  });
  
  if (isLoading) {
    showStatusMessage('Carregando...', 'loading');
  } else {
    const statusElement = getElement('status-message');
    if (statusElement && statusElement.classList.contains('status-loading')) {
      statusElement.style.display = 'none';
    }
  }
}

// Função para exibir informações do usuário logado
function displayUserInfo() {
  const userInfoElement = getElement('user-info');
  
  if (!userInfoElement || !currentUser) return;
  
  const avatarUrl = currentUser.avatar 
    ? `https://cdn.discordapp.com/avatars/${currentUser.id}/${currentUser.avatar}.png` 
    : 'https://cdn.discordapp.com/embed/avatars/0.png';
  
  userInfoElement.innerHTML = `
    <img src="${avatarUrl}" alt="${currentUser.username}" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
    <div>
      <span class="username">${currentUser.username}</span>
      <br>
      <small>#${currentUser.discriminator || '0'}</small>
    </div>
    <a href="/api/auth_logout" class="button logout">Sair</a>
  `;
}

// Função para buscar e exibir a lista de comandos
async function loadCommandsList() {
  const commandsContainer = getElement('commands-container');
  
  if (!commandsContainer) return;
  
  try {
    const response = await fetch('/command_data.json');
    
    if (!response.ok) {
      throw new Error('Não foi possível carregar a lista de comandos');
    }
    
    const commands = await response.json();
    
    commandsContainer.innerHTML = '';
    
    // Agrupar comandos por categoria
    const categories = {};
    
    commands.forEach(cmd => {
      const category = cmd.category || 'Sem categoria';
      
      if (!categories[category]) {
        categories[category] = [];
      }
      
      categories[category].push(cmd);
    });
    
    // Criar os elementos HTML para cada categoria
    Object.keys(categories).sort().forEach(category => {
      const categorySection = document.createElement('div');
      categorySection.className = 'card animate-fadeIn';
      
      categorySection.innerHTML = `<h2>${category}</h2>`;
      
      // Adicionar cada comando da categoria
      categories[category].forEach(cmd => {
        const commandCard = document.createElement('div');
        commandCard.className = 'command-card';
        
        let usage = cmd.usage ? `/${cmd.name} ${cmd.usage}` : `/${cmd.name}`;
        
        commandCard.innerHTML = `
          <div class="command-name">${cmd.name}</div>
          <div class="command-description">${cmd.description || 'Sem descrição disponível.'}</div>
          <div class="command-usage">${usage}</div>
        `;
        
        categorySection.appendChild(commandCard);
      });
      
      commandsContainer.appendChild(categorySection);
    });
  } catch (error) {
    console.error('Erro ao carregar comandos:', error);
    commandsContainer.innerHTML = `
      <div class="card">
        <p>Não foi possível carregar a lista de comandos. Por favor, tente novamente mais tarde.</p>
      </div>
    `;
  }
}

// Função de inicialização para a página de dashboard
async function initDashboard() {
  const isLoggedIn = await checkLoginStatus();
  
  if (!isLoggedIn) return;
  
  // Carregar servidores
  const guilds = await fetchUserGuilds();
  displayGuildsList(guilds);
  displayUserInfo();
  
  // Configurar listeners de eventos
  const welcomeForm = getElement('welcome-form');
  if (welcomeForm) {
    welcomeForm.addEventListener('submit', saveWelcomeConfig);
  }
}

// Função de inicialização para a página de comandos
async function initCommandsPage() {
  await loadCommandsList();
}

// Função principal de inicialização
async function init() {
  // Determinar qual página estamos e inicializar apropriadamente
  const currentPath = window.location.pathname;
  
  if (currentPath.includes('/dashboard') || currentPath.includes('/config/')) {
    await initDashboard();
  } else if (currentPath.includes('/comandos')) {
    await initCommandsPage();
  } else {
    // Página inicial / login - não precisa de inicialização especial
  }
}

// Iniciar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', init);