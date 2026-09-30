import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';
import 'app_localizations.dart';

/// Extension on BuildContext to provide clean localization access.
///
/// Usage inside any Widget build():
///   final l = context.l10n;
///   Text(l('upload_title'))
///
/// Or inline:
///   Text(context.l10n('nav_home'))
extension L10nContext on BuildContext {
  /// Returns a translator function bound to the current app language.
  String Function(String key) get l10n {
    final lang = read<AppState>().language;
    return (String key) => tr(key, lang);
  }
}
