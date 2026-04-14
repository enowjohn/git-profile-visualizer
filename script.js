/**
 * GitHub Profile Visualizer
 * Main application class for fetching and displaying GitHub user data
 */

class GitHubVisualizer {
    constructor() {
        this.apiBase = 'https://api.github.com';
        this.currentUsername = '';
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.bindEvents();
        console.log('GitHub Profile Visualizer initialized');
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        const searchBtn = document.getElementById('searchBtn');
        const usernameInput = document.getElementById('usernameInput');
        const followersCard = document.getElementById('followersCard');
        const closeFollowersModal = document.getElementById('closeFollowersModal');
        const backToProfile = document.getElementById('backToProfile');

        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.search());
        }

        if (usernameInput) {
            usernameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.search();
            });
        }

        if (followersCard) {
            followersCard.addEventListener('click', () => this.showFollowers());
        }

        if (closeFollowersModal) {
            closeFollowersModal.addEventListener('click', () => this.hideFollowersModal());
        }

        if (backToProfile) {
            backToProfile.addEventListener('click', () => this.hideFollowersModal());
        }

        // Close modal when clicking outside
        document.addEventListener('click', (e) => {
            const modal = document.getElementById('followersModal');
            if (modal && !modal.contains(e.target) && !followersCard.contains(e.target)) {
                this.hideFollowersModal();
            }
        });
    }

    /**
     * Main search function
     */
    async search() {
        const username = this.getUsername();
        
        if (!username) {
            this.showError('Please enter a GitHub username');
            return;
        }

        this.currentUsername = username;
        this.hideError();
        this.showLoading();
        this.hideResults();

        try {
            // Fetch user data and repositories in parallel
            const [userData, reposData] = await Promise.all([
                this.fetchUser(username),
                this.fetchRepos(username)
            ]);

            // Display all sections
            this.displayProfile(userData);
            this.displayStats(userData, reposData);
            await this.displayLanguages(reposData);
            await this.displayContributionHeatmap(username);
            this.displayTopRepos(reposData);
            
            this.showResults();
        } catch (error) {
            this.handleError(error);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Get username from input
     */
    getUsername() {
        const input = document.getElementById('usernameInput');
        return input ? input.value.trim() : '';
    }

    /**
     * Fetch user data from GitHub API
     */
    async fetchUser(username) {
        const response = await fetch(`${this.apiBase}/users/${username}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('User not found');
            } else if (response.status === 403) {
                throw new Error('API rate limit exceeded. Please try again later.');
            } else {
                throw new Error('Failed to fetch user data');
            }
        }
        
        return response.json();
    }

    /**
     * Fetch user repositories from GitHub API
     */
    async fetchRepos(username) {
        const response = await fetch(`${this.apiBase}/users/${username}/repos?per_page=100&sort=updated`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch repositories');
        }
        
        return response.json();
    }

    /**
     * Fetch user followers from GitHub API
     */
    async fetchFollowers(username) {
        const response = await fetch(`${this.apiBase}/users/${username}/followers?per_page=100`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch followers');
        }
        
        return response.json();
    }

    /**
     * Generate mock contribution data
     */
    async fetchContributionStats(username) {
        try {
            const repos = await this.fetchRepos(username);
            const totalCommits = repos.reduce((sum, repo) => sum + (repo.pushed_at ? 1 : 0), 0);
            return this.generateMockContributionData(totalCommits);
        } catch (error) {
            console.warn('Could not fetch contribution data, using fallback');
            return this.generateMockContributionData(50);
        }
    }

    /**
     * Generate mock contribution data based on activity level
     */
    generateMockContributionData(activity) {
        const data = [];
        const today = new Date();
        
        for (let week = 0; week < 52; week++) {
            for (let day = 0; day < 7; day++) {
                const date = new Date(today);
                date.setDate(date.getDate() - (week * 7 + (6 - day)));
                
                // Simulate contribution count based on random and activity level
                const baseChance = Math.min(activity / 100, 0.8);
                const contributions = Math.random() < baseChance ? 
                    Math.floor(Math.random() * Math.min(10, Math.max(1, activity / 10))) : 0;
                
                data.push({
                    date: date.toISOString().split('T')[0],
                    count: contributions
                });
            }
        }
        
        return data;
    }

    /**
     * Display user profile information
     */
    displayProfile(user) {
        const profileHeader = document.getElementById('profileHeader');
        
        if (!profileHeader) return;

        profileHeader.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg p-8">
                <div class="flex flex-col md:flex-row items-center gap-6">
                    <img src="${user.avatar_url}" alt="${user.name || user.login}" 
                         class="w-32 h-32 rounded-full border-4 border-blue-500 shadow-lg">
                    <div class="flex-1 text-center md:text-left">
                        <h2 class="text-3xl font-bold text-gray-800 mb-2">
                            ${user.name || user.login}
                        </h2>
                        <p class="text-gray-600 mb-4">
                            ${user.bio || 'No bio available'}
                        </p>
                        <div class="flex flex-wrap gap-4 justify-center md:justify-start text-sm mb-4">
                            ${user.location ? `<span><i class="fas fa-map-marker-alt mr-1"></i>${user.location}</span>` : ''}
                            ${user.company ? `<span><i class="fas fa-building mr-1"></i>${user.company}</span>` : ''}
                            ${user.blog ? `<span><i class="fas fa-link mr-1"></i><a href="${user.blog}" target="_blank" class="text-blue-600 hover:underline">${user.blog}</a></span>` : ''}
                            ${user.twitter_username ? `<span><i class="fab fa-twitter mr-1"></i>@${user.twitter_username}</span>` : ''}
                        </div>
                        <div class="flex gap-4 justify-center md:justify-start text-sm text-gray-500">
                            <span><i class="fas fa-calendar-alt mr-1"></i>Joined ${new Date(user.created_at).toLocaleDateString()}</span>
                        </div>
                        <div class="mt-4">
                            <a href="${user.html_url}" target="_blank" 
                               class="inline-flex items-center px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors">
                                <i class="fab fa-github mr-2"></i>View on GitHub
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Display user statistics
     */
    displayStats(user, repos) {
        const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
        const totalForks = repos.reduce((sum, repo) => sum + repo.forks_count, 0);
        
        this.updateElement('repoCount', user.public_repos);
        this.updateElement('starCount', totalStars);
        this.updateElement('followerCount', user.followers);
        this.updateElement('followingCount', user.following);
    }

    /**
     * Display language distribution chart and list
     */
    async displayLanguages(repos) {
        const languageData = this.processLanguageData(repos);
        
        if (languageData.length === 0) {
            this.displayNoLanguages();
            return;
        }

        this.createLanguageChart(languageData);
        this.createLanguageList(languageData);
    }

    /**
     * Process repository data to extract language statistics
     */
    processLanguageData(repos) {
        const languages = {};
        let totalSize = 0;

        repos.forEach(repo => {
            if (repo.language) {
                languages[repo.language] = (languages[repo.language] || 0) + repo.size;
                totalSize += repo.size;
            }
        });

        return Object.entries(languages)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([lang, size]) => ({
                label: lang,
                value: size,
                percentage: totalSize > 0 ? ((size / totalSize) * 100).toFixed(1) : 0
            }));
    }

    /**
     * Create language distribution chart
     */
    createLanguageChart(languageData) {
        const canvas = document.getElementById('languageChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: languageData.map(d => d.label),
                datasets: [{
                    data: languageData.map(d => d.value),
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
                        '#4BC0C0', '#FF6384'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const data = languageData[context.dataIndex];
                                return `${data.label}: ${data.percentage}%`;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Create language statistics list
     */
    createLanguageList(languageData) {
        const languageList = document.getElementById('languageList');
        if (!languageList) return;

        languageList.innerHTML = languageData.map(lang => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div class="flex items-center gap-3">
                    <div class="w-4 h-4 rounded-full" style="background-color: ${this.getLanguageColor(lang.label)}"></div>
                    <span class="font-medium">${lang.label}</span>
                </div>
                <div class="text-right">
                    <div class="font-bold">${lang.percentage}%</div>
                    <div class="text-xs text-gray-500">${this.formatBytes(lang.value)}</div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Display message when no languages are found
     */
    displayNoLanguages() {
        const languageList = document.getElementById('languageList');
        if (languageList) {
            languageList.innerHTML = '<p class="text-gray-500 text-center">No language data available</p>';
        }
    }

    /**
     * Display contribution heatmap
     */
    async displayContributionHeatmap(username) {
        const contributions = await this.fetchContributionStats(username);
        const heatmap = document.getElementById('contributionHeatmap');
        
        if (!heatmap) return;

        const weeks = this.groupContributionsByWeeks(contributions);
        heatmap.innerHTML = this.createHeatmapHTML(weeks);
    }

    /**
     * Group contributions by weeks for heatmap display
     */
    groupContributionsByWeeks(contributions) {
        const weeks = [];
        for (let i = 0; i < contributions.length; i += 7) {
            weeks.push(contributions.slice(i, i + 7));
        }
        return weeks;
    }

    /**
     * Create heatmap HTML
     */
    createHeatmapHTML(weeks) {
        return `
            <div class="overflow-x-auto">
                <div class="inline-block min-w-full">
                    <div class="grid grid-rows-7 gap-1" style="grid-template-columns: repeat(${weeks.length}, 1fr);">
                        ${weeks.map(week => 
                            week.map(day => {
                                const intensity = this.getContributionIntensity(day.count);
                                return `<div class="contribution-day w-3 h-3 rounded-sm ${intensity}" 
                                        title="${day.date}: ${day.count} contributions"></div>`;
                            }).join('')
                        ).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get contribution intensity color class
     */
    getContributionIntensity(count) {
        if (count === 0) return 'bg-gray-200';
        if (count <= 2) return 'bg-green-200';
        if (count <= 5) return 'bg-green-300';
        if (count <= 8) return 'bg-green-400';
        return 'bg-green-500';
    }

    /**
     * Display top repositories
     */
    displayTopRepos(repos) {
        const topRepos = repos
            .sort((a, b) => b.stargazers_count - a.stargazers_count)
            .slice(0, 10);

        const repoList = document.getElementById('repoList');
        if (!repoList) return;

        repoList.innerHTML = topRepos.map(repo => this.createRepoCard(repo)).join('');
    }

    /**
     * Create repository card HTML
     */
    createRepoCard(repo) {
        return `
            <div class="repo-card bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <h3 class="font-bold text-lg mb-2">
                            <a href="${repo.html_url}" target="_blank" class="text-blue-600 hover:underline">
                                ${repo.name}
                            </a>
                        </h3>
                        <p class="text-gray-600 text-sm mb-3">
                            ${repo.description || 'No description available'}
                        </p>
                        <div class="flex flex-wrap gap-3 text-sm">
                            ${repo.language ? `
                                <span class="flex items-center gap-1">
                                    <span class="w-3 h-3 rounded-full" style="background-color: ${this.getLanguageColor(repo.language)}"></span>
                                    ${repo.language}
                                </span>
                            ` : ''}
                            <span>
                                <i class="fas fa-star text-yellow-500"></i> ${repo.stargazers_count}
                            </span>
                            <span>
                                <i class="fas fa-code-branch text-blue-500"></i> ${repo.forks_count}
                            </span>
                            <span>
                                <i class="fas fa-eye text-gray-500"></i> ${repo.watchers_count}
                            </span>
                        </div>
                    </div>
                    ${repo.fork ? '<span class="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Fork</span>' : ''}
                </div>
            </div>
        `;
    }

    /**
     * Get language color for display
     */
    getLanguageColor(language) {
        const colors = {
            'JavaScript': '#f1e05a',
            'Python': '#3572A5',
            'Java': '#b07219',
            'TypeScript': '#2b7489',
            'C++': '#f34b7d',
            'C#': '#178600',
            'PHP': '#4F5D95',
            'Ruby': '#701516',
            'Go': '#00ADD8',
            'Swift': '#ffac45',
            'Kotlin': '#F18E33',
            'Rust': '#dea584',
            'Vue': '#41b883',
            'CSS': '#563d7c',
            'HTML': '#e34c26'
        };
        return colors[language] || '#888888';
    }

    /**
     * Format bytes to human readable format
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    /**
     * Update element content safely
     */
    updateElement(id, content) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = content;
        }
    }

    /**
     * Show followers modal and fetch followers
     */
    async showFollowers() {
        if (!this.currentUsername) {
            this.showError('No user profile loaded');
            return;
        }

        this.showFollowersModal();
        this.showFollowersLoading();

        try {
            const followers = await this.fetchFollowers(this.currentUsername);
            this.displayFollowers(followers);
        } catch (error) {
            console.error('Error fetching followers:', error);
            this.displayFollowersError();
        } finally {
            this.hideFollowersLoading();
        }
    }

    /**
     * Display followers in the modal
     */
    displayFollowers(followers) {
        const followersList = document.getElementById('followersList');
        if (!followersList) return;

        if (followers.length === 0) {
            followersList.innerHTML = `
                <div class="col-span-full text-center py-8 text-gray-500">
                    <i class="fas fa-users text-4xl mb-4"></i>
                    <p>No followers found</p>
                </div>
            `;
            return;
        }

        followersList.innerHTML = followers.map(follower => this.createFollowerCard(follower)).join('');
    }

    /**
     * Create follower card HTML
     */
    createFollowerCard(follower) {
        return `
            <div class="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer" onclick="window.githubVisualizer.analyzeUser('${follower.login}')">
                <div class="flex items-center gap-3">
                    <img src="${follower.avatar_url}" alt="${follower.login}" 
                         class="w-12 h-12 rounded-full border-2 border-gray-300">
                    <div class="flex-1">
                        <h3 class="font-semibold text-gray-800 hover:text-blue-600 transition-colors">
                            ${follower.login}
                        </h3>
                        <p class="text-sm text-gray-600">
                            ${follower.name || 'No name available'}
                        </p>
                        <div class="flex gap-3 text-xs text-gray-500 mt-1">
                            <span><i class="fas fa-users"></i> ${follower.followers || 0}</span>
                            <span><i class="fas fa-code-branch"></i> ${follower.public_repos || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Analyze a specific user (from follower click)
     */
    async analyzeUser(username) {
        this.hideFollowersModal();
        document.getElementById('usernameInput').value = username;
        await this.search();
    }

    /**
     * Display followers error message
     */
    displayFollowersError() {
        const followersList = document.getElementById('followersList');
        if (followersList) {
            followersList.innerHTML = `
                <div class="col-span-full text-center py-8 text-red-500">
                    <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                    <p>Failed to load followers</p>
                    <button onclick="window.githubVisualizer.showFollowers()" class="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        Try Again
                    </button>
                </div>
            `;
        }
    }

    /**
     * Modal UI state management
     */
    showFollowersModal() {
        this.toggleElement('followersModal', false);
    }

    hideFollowersModal() {
        this.toggleElement('followersModal', true);
    }

    showFollowersLoading() {
        this.toggleElement('followersLoading', false);
    }

    hideFollowersLoading() {
        this.toggleElement('followersLoading', true);
    }

    /**
     * Handle errors gracefully
     */
    handleError(error) {
        console.error('GitHub Visualizer Error:', error);
        
        if (error.message.includes('rate limit')) {
            this.showError('GitHub API rate limit exceeded. Please try again in a few minutes.');
        } else if (error.message.includes('User not found')) {
            this.showError('User not found. Please check the username and try again.');
        } else {
            this.showError('Failed to fetch GitHub data. Please try again.');
        }
    }

    /**
     * UI State Management
     */
    showLoading() {
        this.toggleElement('loadingState', false);
    }

    hideLoading() {
        this.toggleElement('loadingState', true);
    }

    showResults() {
        this.toggleElement('resultsSection', false);
    }

    hideResults() {
        this.toggleElement('resultsSection', true);
    }

    showError(message) {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
        }
    }

    hideError() {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
    }

    /**
     * Toggle element visibility
     */
    toggleElement(id, hide) {
        const element = document.getElementById(id);
        if (element) {
            if (hide) {
                element.classList.add('hidden');
            } else {
                element.classList.remove('hidden');
            }
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.githubVisualizer = new GitHubVisualizer();
});

// Export for testing or module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GitHubVisualizer;
}
