from services.symbol_service import get_repository_symbols

symbols = get_repository_symbols(
    "repos/codepilot-ai"
)

for symbol in symbols[:5]:

    print("=" * 50)

    print(symbol["file"])
    print(symbol["name"])
    print(symbol["type"])

    print(symbol["content"])