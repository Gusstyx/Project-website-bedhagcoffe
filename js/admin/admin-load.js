        async function loadContent(target, filename) {
            try {
                const response = await fetch(filename);
                if (response.ok) {
                    const content = await response.text();
                    document.getElementById(target).innerHTML = content;
                    
                    // Load corresponding JS file if it exists
                    const scriptSrc = `js/${target}.js`;
                    if (!document.querySelector(`script[src="${scriptSrc}"]`)) {
                        const script = document.createElement('script');
                        script.src = scriptSrc;
                        script.onerror = () => console.log(`Script ${scriptSrc} not found, using default admin.js`);
                        document.body.appendChild(script);
                    }
                } else {
                    console.error(`Failed to load ${filename}`);
                    document.getElementById(target).innerHTML = '<div class="error-message">Gagal memuat konten</div>';
                }
            } catch (error) {
                console.error('Error loading content:', error);
                document.getElementById(target).innerHTML = '<div class="error-message">Terjadi kesalahan saat memuat konten</div>';
            }
        }

        // Enhanced menu item click handler
        document.addEventListener('DOMContentLoaded', function() {
            const menuItems = document.querySelectorAll('.menu-item[data-target]');
            const panels = document.querySelectorAll('.panel');
            const pageTitle = document.getElementById('page-title');

            // Content mapping
            const contentMap = {
                'products': 'manage-product.html',
                'partners': 'manage-mitra.html', 
                'predictions': 'prediksi.html',
                'documents': 'dokumen.html'
            };

            // Title mapping
            const titleMap = {
                'dashboard': 'Dashboard',
                'products': 'Produk Kopi',
                'partners': 'Mitra Bisnis',
                'predictions': 'Prediksi Produk',
                'documents': 'Dokumen & Kontrak'
            };

            menuItems.forEach(item => {
                item.addEventListener('click', async function() {
                    const target = this.getAttribute('data-target');
                    
                    // Remove active class from all menu items and panels
                    menuItems.forEach(mi => mi.classList.remove('active'));
                    panels.forEach(panel => panel.classList.remove('active'));
                    
                    // Add active class to clicked menu item
                    this.classList.add('active');
                    
                    // Update page title
                    pageTitle.textContent = titleMap[target] || 'Dashboard';
                    
                    // Show target panel
                    const targetPanel = document.getElementById(target);
                    if (targetPanel) {
                        targetPanel.classList.add('active');
                        
                        // Load content if it's not dashboard and content is empty
                        if (target !== 'dashboard' && contentMap[target] && targetPanel.innerHTML.trim() === '') {
                            await loadContent(target, contentMap[target]);
                        }
                    }
                });
            });

            // Initialize tooltips and other UI enhancements
            initializeUIEnhancements();
        });

        // UI Enhancement functions
        function initializeUIEnhancements() {
            // Add loading states
            const buttons = document.querySelectorAll('.btn');
            buttons.forEach(button => {
                button.addEventListener('click', function() {
                    if (!this.classList.contains('loading')) {
                        this.classList.add('loading');
                        setTimeout(() => {
                            this.classList.remove('loading');
                        }, 1000);
                    }
                });
            });

            // Add hover effects to stat cards
            const statCards = document.querySelectorAll('.stat-card');
            statCards.forEach(card => {
                card.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateY(-5px)';
                });
                card.addEventListener('mouseleave', function() {
                    this.style.transform = 'translateY(0)';
                });
            });
        }

        // Global utility functions
        window.showNotification = function(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.classList.add('show');
            }, 100);
            
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 300);
            }, 3000);
        };

        // Global modal utilities
        window.openModal = function(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'flex';
                document.body.classList.add('modal-open');
            }
        };

        window.closeModal = function(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'none';
                document.body.classList.remove('modal-open');
            }
        };

        // Global search functionality
        window.searchTable = function(searchInput, tableId) {
            const filter = searchInput.value.toLowerCase();
            const table = document.getElementById(tableId);
            const rows = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
            
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const cells = row.getElementsByTagName('td');
                let found = false;
                
                for (let j = 0; j < cells.length; j++) {
                    if (cells[j].textContent.toLowerCase().includes(filter)) {
                        found = true;
                        break;
                    }
                }
                
                row.style.display = found ? '' : 'none';
            }
        };

        // Export functionality
        window.exportToCSV = function(tableId, filename) {
            const table = document.getElementById(tableId);
            const rows = table.querySelectorAll('tr');
            const csv = [];
            
            rows.forEach(row => {
                const cells = row.querySelectorAll('td, th');
                const rowData = [];
                cells.forEach(cell => {
                    rowData.push('"' + cell.textContent.replace(/"/g, '""') + '"');
                });
                csv.push(rowData.join(','));
            });
            
            const csvContent = csv.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);
        };
