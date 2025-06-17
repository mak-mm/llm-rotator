# Example Queries to Test

## 1. Simple Queries (No Privacy Concerns)
```
What is the capital of Japan?
Explain quantum computing in simple terms.
What are the benefits of renewable energy?
```

## 2. PII-Containing Queries (Privacy-Sensitive)
```
My name is Alice Johnson and my email is alice@company.com. Can you help me with cybersecurity?
I live at 123 Main Street, New York. What's the weather like?
My phone number is 555-123-4567. Can you recommend a good restaurant nearby?
My SSN is 123-45-6789 and I need help with tax filing.
```

## 3. Code-Containing Queries
```
How can I improve this Python function: def calculate(x): return x * 2
Review this SQL: SELECT * FROM users WHERE password = 'admin123'
Debug this JavaScript: function test() { console.log('hello' }
Optimize this code: import os; print(os.getenv('SECRET_KEY'))
```

## 4. Mixed PII + Code Queries (Maximum Privacy)
```
I'm John Doe (john@example.com) working on: import requests; requests.get('api.example.com', auth=('user', 'password123')). How can I secure this API call?
My name is Sarah (sarah@company.com) and I'm debugging: def login(username, password): return username == 'admin' and password == 'secret'. What's wrong with this?
```

## 5. Business Scenarios
```
Our company uses customer data like emails and phone numbers in our Python analytics scripts. How can we ensure GDPR compliance?
I'm building a healthcare app that processes patient records. What security measures should I implement?
We need to fragment sensitive queries across multiple AI providers for security. How would you approach this?
```

## Expected Behaviors

### Simple Queries
- ✅ Single fragment
- ✅ Direct processing
- ✅ Fast response (< 2 seconds)
- ✅ No privacy concerns

### PII Queries  
- ✅ Multiple fragments (2-4)
- ✅ PII detected and isolated
- ✅ Redacted processing
- ✅ No sensitive data in final response

### Code Queries
- ✅ Code detected and isolated
- ✅ Separate processing for code blocks
- ✅ Security-conscious responses
- ✅ No code secrets leaked

### Mixed Queries
- ✅ Maximum fragmentation
- ✅ Both PII and code isolation
- ✅ High privacy level achieved
- ✅ Comprehensive security measures