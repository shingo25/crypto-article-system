# AI Article Template Specification v2 Documentation

## Overview

The AI Article Template Specification v2 defines a comprehensive schema for creating reusable templates that
guide the AI article generation process. This specification ensures consistency, quality, and flexibility across
different article types.

## Template Example: Market Daily Roundup

```yaml
version: "2.0"
metadata:
  name: "Market Daily Roundup"
  description: "Comprehensive daily cryptocurrency market analysis"
  created: "2024-01-26"

template:
  id: "market_daily_roundup_v2"
  name: "Crypto Market Daily Roundup"
  description: "AI-generated comprehensive daily market analysis covering price movements, key events, and market sentiment"
  version: "2.0.1"
  article_type: "market_overview"

  content:
    min_words: 800
    max_words: 1200
    tone: "analytical"
    style: "report"
    language: "en"

  ai_config:
    provider: "openai"
    model: "gpt-4-turbo-preview"
    temperature: 0.7
    max_tokens: 2000
    presence_penalty: 0.1
    frequency_penalty: 0.2

  structure:
    sections:
      - type: "title"
        required: true
        min_words: 5
        max_words: 15
        prompts:
          - "Create a compelling title for today's crypto market roundup focusing on the main trend"

      - type: "introduction"
        required: true
        min_words: 100
        max_words: 150
        prompts:
          - "Write an engaging introduction summarizing the overall market sentiment and key highlights"

      - type: "body"
        required: true
        min_words: 500
        max_words: 800
        prompts:
          - "Analyze top 5 cryptocurrency price movements with percentage changes"
          - "Discuss major market events and their impact"
          - "Examine trading volume trends and market liquidity"
          - "Evaluate institutional activity and whale movements"

      - type: "conclusion"
        required: true
        min_words: 100
        max_words: 150
        prompts:
          - "Summarize key takeaways and provide market outlook for the next 24 hours"

  data_requirements:
    required_fields:
      - field_name: "market_date"
        field_type: "date"
        description: "Date of market analysis"
        validation: "^\\d{4}-\\d{2}-\\d{2}$"

      - field_name: "top_movers"
        field_type: "array"
        description: "Top 5 gaining/losing cryptocurrencies"
        validation: "min:5,max:10"

      - field_name: "btc_price"
        field_type: "number"
        description: "Current Bitcoin price in USD"
        validation: "min:1000"

      - field_name: "market_cap_total"
        field_type: "number"
        description: "Total crypto market capitalization"
        validation: "min:100000000"

    optional_fields:
      - field_name: "sentiment_score"
        field_type: "number"
        description: "Market sentiment score (0-100)"
        default_value: 50

      - field_name: "major_news"
        field_type: "array"
        description: "Major news headlines"
        default_value: []

  seo:
    meta_title_template: "Crypto Market Roundup {market_date} - Top Movers & Analysis"
    meta_description_template: "Daily cryptocurrency market analysis for {market_date}. Bitcoin at ${btc_price}, market cap ${market_cap_total}. Expert insights on top movers and trends."
    keywords:
      - "cryptocurrency market analysis"
      - "bitcoin price today"
      - "crypto market roundup"
      - "daily crypto report"
    focus_keyword: "crypto market analysis"

  publishing:
    wordpress_settings:
      status: "publish"
      categories:
        - "Market Analysis"
        - "Daily Reports"
      tags:
        - "market-roundup"
        - "price-analysis"
        - "btc"
        - "eth"
      author_id: 1
      featured_image_prompt: "Modern financial dashboard showing cryptocurrency charts and graphs, professional blue and green color scheme"

    scheduling:
      preferred_time: "08:00"
      timezone: "America/New_York"
      avoid_weekends: false

  quality_checks:
    fact_checking:
      enabled: true
      min_confidence: 0.85
      require_citations: true

    content_scoring:
      min_readability_score: 60
      max_keyword_density: 3.0
      require_unique_content: true

    compliance:
      avoid_financial_advice: true
      require_disclaimer: true
      prohibited_terms:
        - "guaranteed returns"
        - "risk-free"
        - "insider information"

  post_processing:
    html_formatting: true
    add_internal_links: true
    add_external_links: true
    image_generation:
      enabled: true
      provider: "dall-e"
      style: "professional financial infographic with charts"

  monitoring:
    track_performance: true
    analytics_tags:
      - "daily-roundup"
      - "market-analysis"
    success_metrics:
      - metric_name: "page_views"
        threshold: 500
      - metric_name: "time_on_page"
        threshold: 120
      - metric_name: "social_shares"
        threshold: 10
```

## Key Features

### 1. Flexible Content Configuration

- Word count ranges for different sections
- Multiple tone and style options
- Multi-language support ready

### 2. AI Provider Agnostic

- Support for OpenAI, Gemini, Claude
- Configurable generation parameters
- Model-specific optimizations

### 3. Structured Content

- Defined sections with specific purposes
- Guided prompts for consistency
- Flexible section requirements

### 4. Data-Driven Generation

- Required and optional data fields
- Input validation rules
- Default value support

### 5. SEO Optimization

- Template-based meta tags
- Keyword configuration
- Focus keyword tracking

### 6. Publishing Automation

- WordPress integration
- Scheduling preferences
- Category/tag management

### 7. Quality Assurance

- Fact-checking requirements
- Content scoring thresholds
- Compliance rules

### 8. Performance Monitoring

- Success metrics definition
- Analytics integration
- Performance thresholds