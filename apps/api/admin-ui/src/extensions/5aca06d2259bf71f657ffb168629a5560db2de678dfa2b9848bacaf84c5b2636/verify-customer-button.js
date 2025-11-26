// Simple JavaScript to add verification button to Vendure Admin UI
(function() {
    // Wait for page to load
    document.addEventListener('DOMContentLoaded', function() {
        addVerificationButton();
    });

    // Also listen for route changes in SPA
    window.addEventListener('popstate', function() {
        setTimeout(addVerificationButton, 500);
    });

    function addVerificationButton() {
        // Check if we're on a customer detail page
        if (!window.location.pathname.includes('/customers/') || 
            window.location.pathname.endsWith('/customers')) {
            return;
        }

        // Check if button already exists
        if (document.querySelector('#verify-customer-btn')) {
            return;
        }

        // Find the customer actions area (usually in the header or action bar)
        const actionBar = document.querySelector('vdr-action-bar, .action-bar, .customer-actions, .page-header-actions');
        
        if (!actionBar) {
            // Retry after a delay
            setTimeout(addVerificationButton, 1000);
            return;
        }

        // Get customer ID from URL
        const customerId = window.location.pathname.match(/\/customers\/(\d+)/)?.[1];
        if (!customerId) return;

        // Create verification button
        const verifyButton = document.createElement('button');
        verifyButton.id = 'verify-customer-btn';
        verifyButton.className = 'btn btn-primary';
        verifyButton.innerHTML = `
            <i class="fa fa-user-check" style="margin-right: 5px;"></i>
            Verify Customer
        `;
        
        verifyButton.onclick = function(e) {
            e.preventDefault();
            verifyCustomer(customerId);
        };

        // Add button to action bar
        actionBar.appendChild(verifyButton);
    }

    function verifyCustomer(customerId) {
        // Show confirmation dialog
        if (!confirm('Are you sure you want to manually verify this customer account?\\n\\nThis will bypass the email verification process.')) {
            return;
        }

        // Get auth token from local storage or session storage
        const token = localStorage.getItem('vendure-auth-token') || 
                     sessionStorage.getItem('vendure-auth-token') ||
                     getCookieValue('vendure-auth-token');

        if (!token) {
            alert('Authentication token not found. Please log in again.');
            return;
        }

        // Show loading state
        const button = document.getElementById('verify-customer-btn');
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Verifying...';
        button.disabled = true;

        // GraphQL mutation
        const mutation = `
            mutation ManuallyVerifyCustomer($customerId: ID!) {
                manuallyVerifyCustomer(customerId: $customerId) {
                    ... on ManualVerifyCustomerSuccess {
                        success
                        message
                        customer {
                            emailAddress
                            user {
                                verified
                            }
                        }
                    }
                    ... on ManualVerifyCustomerError {
                        errorCode
                        message
                    }
                }
            }
        `;

        // Make GraphQL request
        fetch('/admin-api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': \`Bearer \${token}\`
            },
            body: JSON.stringify({
                query: mutation,
                variables: { customerId: customerId }
            })
        })
        .then(response => response.json())
        .then(data => {
            // Restore button
            button.innerHTML = originalText;
            button.disabled = false;

            if (data.errors) {
                alert('Error: ' + data.errors[0].message);
                return;
            }

            const result = data.data.manuallyVerifyCustomer;
            
            if (result.success) {
                alert('Customer verified successfully!\\n\\nEmail: ' + result.customer.emailAddress);
                // Refresh the page to show updated status
                window.location.reload();
            } else {
                alert('Verification failed: ' + result.message);
            }
        })
        .catch(error => {
            button.innerHTML = originalText;
            button.disabled = false;
            alert('Network error: ' + error.message);
        });
    }

    function getCookieValue(name) {
        const value = \`; \${document.cookie}\`;
        const parts = value.split(\`; \${name}=\`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }
})();