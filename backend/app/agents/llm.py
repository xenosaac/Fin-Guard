"""Multi-LLM provider abstraction.

Supports Anthropic (Claude) and OpenAI (GPT) with automatic fallback.
Priority: whichever API key is configured. If both, uses the one
specified by LLM_PROVIDER env var (default: anthropic).

No LLM key configured? Falls back to rule-based analysis.
"""
from __future__ import annotations

import logging
from typing import Optional

from app.config import settings

log = logging.getLogger(__name__)


async def llm_analyze(system_prompt: str, user_prompt: str) -> Optional[str]:
    """Send a prompt to the configured LLM and return the response.

    Tries providers in order based on available API keys.
    Returns None if no LLM is available (caller should use rule-based fallback).
    """
    provider = settings.llm_provider

    # Try preferred provider first, then fallback
    if provider == "anthropic" and settings.anthropic_api_key:
        return await _call_anthropic(system_prompt, user_prompt)
    elif provider == "openai" and settings.openai_api_key:
        return await _call_openai(system_prompt, user_prompt)

    # Fallback: try whichever key exists
    if settings.anthropic_api_key:
        return await _call_anthropic(system_prompt, user_prompt)
    if settings.openai_api_key:
        return await _call_openai(system_prompt, user_prompt)

    log.info("No LLM API key configured — using rule-based analysis")
    return None


async def _call_anthropic(system_prompt: str, user_prompt: str) -> Optional[str]:
    try:
        import anthropic

        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        message = client.messages.create(
            model=settings.anthropic_model,
            max_tokens=500,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return message.content[0].text
    except Exception as e:
        log.warning("Anthropic call failed: %s", e)
        return None


async def _call_openai(system_prompt: str, user_prompt: str) -> Optional[str]:
    try:
        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key)
        response = client.chat.completions.create(
            model=settings.openai_model,
            max_tokens=500,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        return response.choices[0].message.content
    except Exception as e:
        log.warning("OpenAI call failed: %s", e)
        return None
